import { useCallback, useEffect, useState } from "react";

import StatePill from "../components/StatePill";
import { formatPesos } from "../lib/money";
import { formatFecha } from "../lib/render-pagare";
import { callFunction, supabase } from "../lib/supabase";
import type { PagareRow } from "../types";

interface Props {
  onNew: () => void;
}

function isAwaiting(pagare: PagareRow): boolean {
  return pagare.instrument_id !== null && pagare.state === "awaiting-signature";
}

/**
 * Lista de pagarés del usuario. Mientras haya alguno esperando firma,
 * consulta el estado cada 30 segundos; el botón "Actualizar estado" hace lo
 * mismo a pedido para una fila.
 */
export default function Pagares({ onNew }: Props) {
  const [pagares, setPagares] = useState<PagareRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pagares")
      .select("*")
      .order("created_at", { ascending: false });
    if (error !== null) {
      setMessage(`No se pudieron cargar los pagarés: ${error.message}`);
      return;
    }
    setPagares(data);
  }, []);

  const refresh = useCallback(
    async (pagare: PagareRow) => {
      setRefreshing(pagare.id);
      try {
        await callFunction<{ pagare: PagareRow }>("refresh-instrument", { pagareId: pagare.id });
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "No se pudo actualizar el estado.");
      } finally {
        setRefreshing(null);
      }
      await load();
    },
    [load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const anyAwaiting = pagares.some(isAwaiting);
  useEffect(() => {
    if (!anyAwaiting) return;
    const timer = setInterval(() => {
      for (const pagare of pagares.filter(isAwaiting)) void refresh(pagare);
    }, 30_000);
    return () => clearInterval(timer);
  }, [anyAwaiting, pagares, refresh]);

  async function copyLink(pagare: PagareRow) {
    if (pagare.signing_url === null) return;
    await navigator.clipboard.writeText(pagare.signing_url);
    setMessage("Enlace copiado.");
  }

  async function downloadSigned(pagare: PagareRow) {
    if (pagare.signed_path === null) return;
    const { data, error } = await supabase.storage
      .from("signed")
      .createSignedUrl(pagare.signed_path, 60, { download: pagare.file_name });
    if (error !== null) {
      setMessage(`No se pudo generar la descarga: ${error.message}`);
      return;
    }
    window.location.assign(data.signedUrl);
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pagarés</h2>
        <button type="button" onClick={onNew} className="rounded bg-gray-900 px-3 py-2 text-white">
          Nuevo pagaré
        </button>
      </div>

      {message !== null && (
        <p className="mb-4 text-sm text-gray-700">
          {message}{" "}
          <button type="button" onClick={() => setMessage(null)} className="underline">
            cerrar
          </button>
        </p>
      )}

      {pagares.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no hay pagarés.</p>
      ) : (
        <table className="w-full rounded-lg border bg-white text-sm shadow-sm">
          <thead className="text-left text-gray-600">
            <tr>
              <th className="p-3">Deudor</th>
              <th className="p-3">Monto</th>
              <th className="p-3">Vencimiento</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {pagares.map((pagare) => (
              <tr key={pagare.id} className="border-t">
                <td className="p-3">{pagare.deudor_nombre}</td>
                <td className="p-3">{formatPesos(pagare.monto_centavos)}</td>
                <td className="p-3">{formatFecha(pagare.fecha_vencimiento)}</td>
                <td className="p-3">
                  <StatePill pagare={pagare} />
                </td>
                <td className="space-x-3 p-3 text-right">
                  {pagare.signing_url !== null && pagare.state !== "signed" && (
                    <button type="button" onClick={() => copyLink(pagare)} className="underline">
                      Copiar enlace
                    </button>
                  )}
                  {isAwaiting(pagare) && (
                    <button
                      type="button"
                      onClick={() => refresh(pagare)}
                      disabled={refreshing === pagare.id}
                      className="underline disabled:opacity-50"
                    >
                      {refreshing === pagare.id ? "Actualizando…" : "Actualizar estado"}
                    </button>
                  )}
                  {pagare.signed_path !== null && (
                    <button type="button" onClick={() => downloadSigned(pagare)} className="underline">
                      Descargar firmado
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
