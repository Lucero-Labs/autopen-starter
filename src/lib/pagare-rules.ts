// ============================================================================
// REGLAS LEGALES DEL PAGARÉ (Argentina).
//
// Este archivo es contenido legal, no código de infraestructura. Cualquier
// cambio — una regla nueva, un mensaje distinto, una severidad distinta —
// requiere la revisión de un abogado y subir PAGARE_RULES_VERSION. Una regla
// equivocada produce un pagaré que se ve bien y no se puede ejecutar, y
// ninguna prueba automática detecta eso.
//
// Ids y mensajes son los del paquete @autopen/rules-pagare-ar (ar.pagare.v1);
// se conservan textualmente para que un registro viejo siga siendo explicable.
// ============================================================================

/** Sube con cada cambio de reglas. Empieza donde quedó ar.pagare.v1. */
export const PAGARE_RULES_VERSION = "1.0.0";

export type DeudorKind = "fisica" | "juridica";

/** Lo que las reglas necesitan saber del deudor. */
export interface Deudor {
  readonly kind: DeudorKind;
  readonly nombre: string;
  readonly dni: string;
}

/** Los campos del pagaré que alguna regla lee. Los opcionales se completan de a poco. */
export interface PagareDraft {
  /** Dónde es pagadero el instrumento. */
  readonly lugarDePago?: string | undefined;
  /** Declaración de crédito al consumo. Obligatoria cuando el deudor es persona física. */
  readonly integracionDeConsumo?: string | undefined;
  readonly deudor: Deudor;
  /** Fecha ISO-8601 (AAAA-MM-DD) del vencimiento, o del primero si hay cuotas. */
  readonly primerVencimiento?: string | undefined;
}

/**
 * Un hallazgo: qué regla, qué gravedad, qué decirle al operador.
 * "blocking" impide enviar; "warning" avisa y deja seguir.
 */
export interface Finding {
  readonly id: string;
  readonly severity: "blocking" | "warning";
  readonly message: string;
  /** El campo del formulario al que apunta. */
  readonly path: string;
}

/** Ausente o solo espacios cuenta como faltante. */
function estaPresente(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

/**
 * Evalúa las tres reglas y devuelve los hallazgos, en el orden de las reglas.
 * `now` se recibe como parámetro para que la evaluación sea reproducible.
 */
export function validarPagare(draft: PagareDraft, now: Date = new Date()): Finding[] {
  const findings: Finding[] = [];

  // Regla 1 — el lugar de pago es requisito de ejecutabilidad.
  if (!estaPresente(draft.lugarDePago)) {
    findings.push({
      id: "ar.pagare.lugar-de-pago-requerido",
      severity: "blocking",
      message: "Lugar de pago — requerido para la ejecutabilidad del pagaré.",
      path: "lugarDePago",
    });
  }

  // Regla 2 — solo rige para persona física; una jurídica no produce hallazgo.
  if (draft.deudor.kind === "fisica" && !estaPresente(draft.integracionDeConsumo)) {
    findings.push({
      id: "ar.pagare.integracion-de-consumo-requerida",
      severity: "blocking",
      message: "Integración de consumo — obligatoria cuando el deudor es persona física.",
      path: "integracionDeConsumo",
    });
  }

  // Regla 3 — aviso, no bloqueo: una fecha pasada suele ser un error de tipeo,
  // pero no vuelve inejecutable el instrumento. Una fecha ilegible se ignora.
  if (draft.primerVencimiento !== undefined) {
    const due = Date.parse(draft.primerVencimiento);
    if (!Number.isNaN(due) && due < now.getTime()) {
      findings.push({
        id: "ar.pagare.primer-vencimiento-en-el-futuro",
        severity: "warning",
        message: "El primer vencimiento es anterior a hoy — revisá la fecha.",
        path: "primerVencimiento",
      });
    }
  }

  return findings;
}

/** Si algún hallazgo impide enviar. */
export function bloquea(findings: readonly Finding[]): boolean {
  return findings.some((finding) => finding.severity === "blocking");
}
