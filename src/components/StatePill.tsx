import type { PagareRow } from "../types";

/** Etiqueta de estado de un pagaré: sin enviar, esperando firma o firmado. */
export default function StatePill({ pagare }: { pagare: PagareRow }) {
  if (pagare.instrument_id === null) {
    return <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">Sin enviar</span>;
  }
  if (pagare.state === "signed") {
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Firmado</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Esperando firma</span>;
}
