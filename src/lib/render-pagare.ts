// Arma el PDF del pagaré: una hoja A4 con el texto del instrumento y un
// espacio para la firma abajo a la derecha. El servicio de firma estampa su
// firma visible en esa esquina, así que ahí no se imprime nada más.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { formatPesos } from "./money";
import type { DeudorKind } from "./pagare-rules";

export interface PagareData {
  readonly beneficiario: string;
  /** Centavos enteros. */
  readonly montoCentavos: number;
  readonly cuotas?: number | undefined;
  readonly lugarDePago: string;
  /** AAAA-MM-DD. */
  readonly fechaVencimiento: string;
  readonly deudor: {
    readonly kind: DeudorKind;
    readonly nombre: string;
    readonly dni: string;
    readonly domicilio: string;
  };
  readonly integracionDeConsumo?: string | undefined;
}

/** "2026-09-10" como "10/09/2026", sin pasar por zonas horarias. */
export function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year !== undefined && month !== undefined && day !== undefined
    ? `${day}/${month}/${year}`
    : iso;
}

const A4 = { width: 595.28, height: 841.89 } as const;
const MARGIN = 60;

/** Renderiza el pagaré y devuelve los bytes del PDF. */
export async function renderPagare(data: PagareData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.width, A4.height]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);

  const title = "PAGARÉ A LA ORDEN";
  const titleSize = 18;
  page.drawText(title, {
    x: (A4.width - bold.widthOfTextAtSize(title, titleSize)) / 2,
    y: A4.height - 90,
    size: titleSize,
    font: bold,
    color: black,
  });

  const lines: string[] = [
    `Por ${formatPesos(data.montoCentavos)}`,
    ...(data.cuotas !== undefined && data.cuotas > 1
      ? [`En ${data.cuotas} cuotas; primer vencimiento el ${formatFecha(data.fechaVencimiento)}.`]
      : [`Vencimiento: ${formatFecha(data.fechaVencimiento)}`]),
    `Pagadero en ${data.lugarDePago}`,
    `A la orden de ${data.beneficiario}`,
    `Deudor: ${data.deudor.nombre}, ${data.deudor.kind === "juridica" ? "CUIT" : "DNI"} ${data.deudor.dni}, ${data.deudor.domicilio}`,
    ...(data.integracionDeConsumo !== undefined && data.integracionDeConsumo.trim() !== ""
      ? [`Integración de consumo: ${data.integracionDeConsumo}`]
      : []),
    "",
    "Pagaré sin protesto a la orden del beneficiario la cantidad indicada, en el lugar y",
    "a la fecha de vencimiento consignados.",
  ];

  let y = A4.height - 140;
  for (const line of lines) {
    if (line !== "") page.drawText(line, { x: MARGIN, y, size: 12, font: regular, color: black });
    y -= 22;
  }

  // Bloque de firma: línea y rótulo, abajo a la derecha, con aire por encima
  // para la firma visible que estampa el servicio.
  const signatureLeft = A4.width - MARGIN - 200;
  page.drawLine({
    start: { x: signatureLeft, y: 110 },
    end: { x: A4.width - MARGIN, y: 110 },
    thickness: 0.8,
    color: black,
  });
  page.drawText("Firma del suscriptor", {
    x: signatureLeft,
    y: 95,
    size: 10,
    font: regular,
    color: black,
  });

  return pdf.save();
}
