// El dinero es un entero de centavos. Nunca un número con decimales: un pagaré
// que difiere en un centavo es un documento que alguien puede discutir.

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

/** `190000000` centavos como `$ 1.900.000,00`. */
export function formatPesos(centavos: number): string {
  // Intl separa el símbolo con un espacio duro; uno común se imprime en todos lados.
  return pesos.format(centavos / 100).replace(/ /g, " ");
}

/**
 * Convierte lo que escribe el usuario en un <input type="number" step="0.01">
 * ("1900000.5") a centavos enteros, sin pasar por aritmética de punto flotante.
 * Devuelve undefined si no es un monto válido.
 */
export function parsePesos(input: string): number | undefined {
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(input.trim());
  if (match === null) return undefined;
  const entero = match[1] ?? "0";
  const decimales = (match[2] ?? "").padEnd(2, "0");
  const centavos = Number(entero) * 100 + Number(decimales);
  return Number.isSafeInteger(centavos) ? centavos : undefined;
}
