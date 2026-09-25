import { describe, expect, it } from "vitest";

import { bloquea, validarPagare, type PagareDraft } from "./pagare-rules";

const now = new Date("2026-08-21T12:00:00.000Z");

const draft = (overrides: Partial<PagareDraft> = {}): PagareDraft => ({
  deudor: { kind: "fisica", nombre: "Carla Giménez", dni: "38945221" },
  primerVencimiento: "2026-09-10",
  lugarDePago: "San Justo, Pcia. de Buenos Aires",
  integracionDeConsumo: "Anexo I - Res. Gral. 1060/2025",
  ...overrides,
});

describe("lugar de pago", () => {
  it("bloquea el envío cuando falta, con el mensaje textual", () => {
    const findings = validarPagare(draft({ lugarDePago: "   " }), now);

    expect(bloquea(findings)).toBe(true);
    expect(findings).toEqual([
      {
        id: "ar.pagare.lugar-de-pago-requerido",
        severity: "blocking",
        message: "Lugar de pago — requerido para la ejecutabilidad del pagaré.",
        path: "lugarDePago",
      },
    ]);
  });
});

describe("integración de consumo", () => {
  it("es obligatoria para persona física y no para persona jurídica", () => {
    const fisica = validarPagare(draft({ integracionDeConsumo: undefined }), now);
    expect(fisica.map((f) => f.id)).toEqual(["ar.pagare.integracion-de-consumo-requerida"]);
    expect(fisica[0]?.message).toBe(
      "Integración de consumo — obligatoria cuando el deudor es persona física.",
    );

    const juridica = validarPagare(
      draft({
        integracionDeConsumo: undefined,
        deudor: { kind: "juridica", nombre: "Transportes SRL", dni: "30712345678" },
      }),
      now,
    );
    expect(juridica).toEqual([]);
  });
});

describe("primer vencimiento", () => {
  it("avisa sin bloquear cuando es anterior a hoy, e ignora una fecha ilegible", () => {
    const pasado = validarPagare(draft({ primerVencimiento: "2026-01-01" }), now);
    expect(bloquea(pasado)).toBe(false);
    expect(pasado).toEqual([
      {
        id: "ar.pagare.primer-vencimiento-en-el-futuro",
        severity: "warning",
        message: "El primer vencimiento es anterior a hoy — revisá la fecha.",
        path: "primerVencimiento",
      },
    ]);

    expect(validarPagare(draft({ primerVencimiento: "not-a-date" }), now)).toEqual([]);
    expect(validarPagare(draft(), now)).toEqual([]);
  });
});
