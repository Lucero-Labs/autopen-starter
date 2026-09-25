// Manda un pagaré al servicio de firma. Recibe { pagareId }, lee la fila y el
// PDF como el usuario que llamó, sella el PDF en el servicio y guarda en la
// fila el id del instrumento y el enlace de firma para el deudor.

import { autopenConfig, createInstrument } from "../_shared/autopen.ts";
import { HttpError, json, readPagareId, serve, userClient } from "../_shared/runtime.ts";

serve(async (request) => {
  const pagareId = await readPagareId(request);
  const { supabase } = await userClient(request);

  const { data: row, error } = await supabase.from("pagares").select("*").eq("id", pagareId).single();
  if (error !== null || row === null) throw new HttpError(404, "No existe ese pagaré.");

  // Ya enviado: devolver lo que hay, sin abrir otro instrumento.
  if (row.instrument_id !== null) return json(200, { pagare: row });

  const { data: file, error: downloadError } = await supabase.storage
    .from("documents")
    .download(row.pdf_path);
  if (downloadError !== null || file === null) {
    throw new HttpError(500, "No se pudo leer el PDF del pagaré.");
  }

  const instrument = await createInstrument(autopenConfig(), {
    reference: row.id,
    fileName: row.file_name,
    pdfBytes: new Uint8Array(await file.arrayBuffer()),
    signer: {
      email: row.signer_email,
      ...(row.signer_phone !== null && row.signer_phone !== "" ? { phone: row.signer_phone } : {}),
    },
  });

  const { data: updated, error: updateError } = await supabase
    .from("pagares")
    .update({
      instrument_id: instrument.instrumentId,
      signing_url: instrument.signingUrl,
      state: instrument.state,
    })
    .eq("id", row.id)
    .select()
    .single();
  if (updateError !== null) throw new HttpError(500, "No se pudo guardar el enlace de firma.");

  return json(200, { pagare: updated });
});
