import { useMemo, useState, type FormEvent } from "react";

import { callFunction, supabase } from "../lib/supabase";
import { parsePesos } from "../lib/money";
import { bloquea, validarPagare, type PagareDraft } from "../lib/pagare-rules";
import { renderPagare } from "../lib/render-pagare";
import type { DeudorKind, PagareRow } from "../types";

interface Props {
  userId: string;
  onCreated: () => void;
  onCancel: () => void;
}

const inputClass = "mt-1 w-full rounded border px-3 py-2";

/**
 * Formulario de pagaré nuevo. Las reglas legales (src/lib/pagare-rules.ts)
 * se evalúan mientras se escribe; un hallazgo bloqueante deshabilita el envío.
 * Al enviar: arma el PDF, lo sube al bucket "documents", crea la fila y llama
 * a la función create-instrument. Si el servicio de firma lo rechaza, se
 * borran archivo y fila y se muestra el motivo para corregir y reintentar.
 */
export default function NewPagare({ userId, onCreated, onCancel }: Props) {
  const [beneficiario, setBeneficiario] = useState("");
  const [monto, setMonto] = useState("");
  const [cuotas, setCuotas] = useState("");
  const [lugarDePago, setLugarDePago] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [deudorKind, setDeudorKind] = useState<DeudorKind>("fisica");
  const [deudorNombre, setDeudorNombre] = useState("");
  const [deudorDni, setDeudorDni] = useState("");
  const [deudorDomicilio, setDeudorDomicilio] = useState("");
  const [integracionDeConsumo, setIntegracionDeConsumo] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const draft: PagareDraft = useMemo(
    () => ({
      lugarDePago,
      integracionDeConsumo,
      deudor: { kind: deudorKind, nombre: deudorNombre, dni: deudorDni },
      primerVencimiento: fechaVencimiento === "" ? undefined : fechaVencimiento,
    }),
    [lugarDePago, integracionDeConsumo, deudorKind, deudorNombre, deudorDni, fechaVencimiento],
  );
  const findings = useMemo(() => validarPagare(draft), [draft]);
  const montoCentavos = parsePesos(monto);
  const canSubmit = !bloquea(findings) && montoCentavos !== undefined && montoCentavos > 0 && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || montoCentavos === undefined) return;
    setBusy(true);
    setError(null);

    const id = crypto.randomUUID();
    const pdfPath = `${userId}/${id}.pdf`;
    const fileName = `pagare-${id}.pdf`;
    const cuotasNumero = cuotas.trim() === "" ? undefined : Number(cuotas);

    const bytes = await renderPagare({
      beneficiario: beneficiario.trim(),
      montoCentavos,
      cuotas: cuotasNumero,
      lugarDePago: lugarDePago.trim(),
      fechaVencimiento,
      deudor: {
        kind: deudorKind,
        nombre: deudorNombre.trim(),
        dni: deudorDni.trim(),
        domicilio: deudorDomicilio.trim(),
      },
      integracionDeConsumo: integracionDeConsumo.trim() === "" ? undefined : integracionDeConsumo.trim(),
    });

    const upload = await supabase.storage
      .from("documents")
      .upload(pdfPath, bytes, { contentType: "application/pdf" });
    if (upload.error !== null) {
      setBusy(false);
      setError(`No se pudo subir el PDF: ${upload.error.message}`);
      return;
    }

    const inserted = await supabase
      .from("pagares")
      .insert({
        id,
        user_id: userId,
        beneficiario: beneficiario.trim(),
        monto_centavos: montoCentavos,
        cuotas: cuotasNumero ?? null,
        lugar_de_pago: lugarDePago.trim(),
        fecha_vencimiento: fechaVencimiento,
        deudor_nombre: deudorNombre.trim(),
        deudor_dni: deudorDni.trim(),
        deudor_domicilio: deudorDomicilio.trim(),
        deudor_kind: deudorKind,
        integracion_de_consumo: integracionDeConsumo.trim() === "" ? null : integracionDeConsumo.trim(),
        signer_email: signerEmail.trim(),
        signer_phone: signerPhone.trim() === "" ? null : signerPhone.trim(),
        pdf_path: pdfPath,
        file_name: fileName,
      })
      .select()
      .single();
    if (inserted.error !== null) {
      await supabase.storage.from("documents").remove([pdfPath]);
      setBusy(false);
      setError(`No se pudo guardar el pagaré: ${inserted.error.message}`);
      return;
    }

    try {
      await callFunction<{ pagare: PagareRow }>("create-instrument", { pagareId: id });
      onCreated();
    } catch (cause) {
      await supabase.from("pagares").delete().eq("id", id);
      await supabase.storage.from("documents").remove([pdfPath]);
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el pagaré.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Nuevo pagaré</h2>

      <label className="block text-sm">
        Beneficiario (a la orden de)
        <input type="text" required value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          Monto en pesos
          <input type="number" required min="0.01" step="0.01" placeholder="1900000.00" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Cuotas <span className="text-gray-500">(opcional)</span>
          <input type="number" min="1" step="1" value={cuotas} onChange={(e) => setCuotas(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          Lugar de pago
          <input type="text" value={lugarDePago} onChange={(e) => setLugarDePago(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Vencimiento
          <input type="date" required value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className={inputClass} />
        </label>
      </div>

      <fieldset className="space-y-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Deudor (quien firma)</legend>
        <label className="block text-sm">
          Tipo de persona
          <select value={deudorKind} onChange={(e) => setDeudorKind(e.target.value as DeudorKind)} className={inputClass}>
            <option value="fisica">Persona física</option>
            <option value="juridica">Persona jurídica</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Nombre completo o razón social
            <input type="text" required value={deudorNombre} onChange={(e) => setDeudorNombre(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            {deudorKind === "juridica" ? "CUIT" : "DNI"}
            <input type="text" required value={deudorDni} onChange={(e) => setDeudorDni(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm">
          Domicilio
          <input type="text" required value={deudorDomicilio} onChange={(e) => setDeudorDomicilio(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Integración de consumo{" "}
          <span className="text-gray-500">(obligatoria si es persona física)</span>
          <input type="text" value={integracionDeConsumo} onChange={(e) => setIntegracionDeConsumo(e.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Correo del deudor
            <input type="email" required value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            Teléfono <span className="text-gray-500">(opcional, +54911…)</span>
            <input type="tel" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} className={inputClass} />
          </label>
        </div>
      </fieldset>

      {findings.length > 0 && (
        <ul className="space-y-1 text-sm">
          {findings.map((finding) => (
            <li key={finding.id} className={finding.severity === "blocking" ? "text-red-700" : "text-amber-700"}>
              {finding.message}
            </li>
          ))}
        </ul>
      )}

      {error !== null && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={!canSubmit} className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50">
          {busy ? "Enviando…" : "Enviar a firmar"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded border px-3 py-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}
