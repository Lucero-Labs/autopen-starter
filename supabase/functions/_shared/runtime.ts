// Lo que las dos funciones comparten y no tiene que ver con el servicio de
// firma: variables de entorno, CORS, respuestas JSON y el cliente de Supabase
// que actúa como el usuario que llamó.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types.ts";

/** Un error que se devuelve al navegador con su código HTTP y su mensaje, en español. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Lee una variable de entorno o falla nombrándola. Nunca imprime el valor. */
export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable ${name} (supabase secrets set ${name}=...)`);
  }
  return value;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Una respuesta JSON con los encabezados que el navegador necesita. */
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Un cliente de Supabase que actúa como el usuario que llamó a la función.
 * Reenvía su JWT, así cada consulta y cada archivo pasan por las políticas RLS:
 * la función no puede ver más que el propio usuario.
 */
export async function userClient(
  request: Request,
): Promise<{ supabase: SupabaseClient<Database>; userId: string }> {
  const authorization = request.headers.get("Authorization");
  if (authorization === null) throw new HttpError(401, "Falta la sesión.");

  const supabase = createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );
  const { data, error } = await supabase.auth.getUser();
  if (error !== null || data.user === null) throw new HttpError(401, "La sesión no es válida.");
  return { supabase, userId: data.user.id };
}

/**
 * Arranca la función: contesta el preflight de CORS y convierte cualquier
 * error en una respuesta JSON. Un HttpError llega con su código y mensaje;
 * cualquier otra cosa es un 500 genérico y el detalle queda en los logs.
 */
export function serve(handler: (request: Request) => Promise<Response>): void {
  Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      console.error(error instanceof Error ? error.message : "unknown failure");
      return json(500, { error: "La función falló. Revisá los logs en Supabase." });
    }
  });
}

/** El `pagareId` del cuerpo, o un 400. */
export async function readPagareId(request: Request): Promise<string> {
  const body: unknown = await request.json().catch(() => null);
  const pagareId =
    typeof body === "object" && body !== null ? (body as { pagareId?: unknown }).pagareId : undefined;
  if (typeof pagareId !== "string" || pagareId === "") {
    throw new HttpError(400, "Falta pagareId.");
  }
  return pagareId;
}
