// Las llamadas al servicio de firma. Es la única parte del proyecto que conoce
// la clave, y la clave nunca sale de acá: ni en logs ni en respuestas.
//
// Contrato del servicio:
//   POST /api/instruments               { reference, fileName, pdfBase64, signer } → instrumento
//   GET  /api/instruments/{id}          → instrumento, con su `state`
//   GET  /api/instruments/{id}/artifact → el PDF firmado; 404 hasta que `state` sea "signed"
// Cada rechazo llega como { error: "..." } con su código: 400, 401, 404, 409, 413.

import { HttpError, requireEnv } from "./runtime.ts";
import type { PagareState } from "./types.ts";

export interface AutopenConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export interface Signer {
  readonly email: string;
  readonly phone?: string;
}

/** Lo que el servicio sabe de un documento nuestro. */
export interface Instrument {
  readonly instrumentId: string;
  readonly reference: string;
  readonly documentId: string;
  readonly state: PagareState;
  readonly signingUrl: string;
}

export interface CreateInstrumentInput {
  readonly reference: string;
  readonly fileName: string;
  readonly pdfBytes: Uint8Array;
  readonly signer: Signer;
}

/** Los dos secretos, leídos del entorno de la función. */
export function autopenConfig(): AutopenConfig {
  return {
    baseUrl: requireEnv("AUTOPEN_BASE_URL").replace(/\/+$/, ""),
    apiKey: requireEnv("AUTOPEN_API_KEY"),
  };
}

/** Qué decirle al usuario por cada código que el servicio puede devolver. */
function describeRefusal(status: number, detail: string): string {
  switch (status) {
    case 400:
      return `El servicio de firma rechazó el pedido: ${detail}`;
    case 401:
      return "El servicio de firma no aceptó la clave. Revisá AUTOPEN_API_KEY.";
    case 404:
      return "El servicio de firma no encuentra ese documento.";
    case 409:
      return `El servicio de firma ya tiene esa referencia con otro contenido o firmante: ${detail}`;
    case 413:
      return "El PDF supera el tamaño máximo que acepta el servicio de firma.";
    default:
      return `El servicio de firma falló (${status}): ${detail}`;
  }
}

async function request(config: AutopenConfig, path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${config.apiKey}` },
  });
  if (response.ok) return response;

  const body: unknown = await response.json().catch(() => null);
  const detail =
    typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : response.statusText;
  throw new HttpError(response.status, describeRefusal(response.status, detail));
}

/** Base64 canónico de un arreglo de bytes, sin cargar librerías. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Sella el PDF en el servicio y devuelve el instrumento con su enlace de firma. */
export async function createInstrument(
  config: AutopenConfig,
  input: CreateInstrumentInput,
): Promise<Instrument> {
  const response = await request(config, "/api/instruments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: input.reference,
      fileName: input.fileName,
      pdfBase64: toBase64(input.pdfBytes),
      signer: input.signer,
    }),
  });
  return (await response.json()) as Instrument;
}

/** El instrumento tal como lo ve el servicio ahora mismo. */
export async function getInstrument(config: AutopenConfig, instrumentId: string): Promise<Instrument> {
  const response = await request(config, `/api/instruments/${encodeURIComponent(instrumentId)}`, {
    method: "GET",
  });
  return (await response.json()) as Instrument;
}

/** El PDF firmado. Solo tiene sentido pedirlo cuando `state` es "signed". */
export async function getArtifact(config: AutopenConfig, instrumentId: string): Promise<Uint8Array> {
  const response = await request(
    config,
    `/api/instruments/${encodeURIComponent(instrumentId)}/artifact`,
    { method: "GET" },
  );
  return new Uint8Array(await response.arrayBuffer());
}
