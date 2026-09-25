// Consulta el estado de un pagaré en el servicio de firma. Recibe
// { pagareId }. Si el servicio dice "signed" y todavía no tenemos copia,
// descarga el PDF firmado, lo guarda en el bucket "signed" y recién entonces
// marca la fila como firmada: primero la copia, después el estado.

import { autopenConfig, getArtifact, getInstrument } from "../_shared/autopen.ts";
import { HttpError, json, readPagareId, serve, userClient } from "../_shared/runtime.ts";
import type { PagareUpdate } from "../_shared/types.ts";

serve(async (request) => {
  const pagareId = await readPagareId(request);
  const { supabase, userId } = await userClient(request);

  const { data: row, error } = await supabase.from("pagares").select("*").eq("id", pagareId).single();
  if (error !== null || row === null) throw new HttpError(404, "No existe ese pagaré.");
  if (row.instrument_id === null) {
    throw new HttpError(400, "El pagaré todavía no fue enviado al servicio de firma.");
  }

  const config = autopenConfig();
  const instrument = await getInstrument(config, row.instrument_id);
  const changes: PagareUpdate = { state: instrument.state };

  if (instrument.state === "signed" && row.signed_path === null) {
    const bytes = await getArtifact(config, row.instrument_id);
    const signedPath = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("signed")
      .upload(signedPath, bytes, { contentType: "application/pdf" });
    if (uploadError !== null) throw new HttpError(500, "No se pudo guardar el PDF firmado.");
    changes.signed_path = signedPath;
  }

  const { data: updated, error: updateError } = await supabase
    .from("pagares")
    .update(changes)
    .eq("id", row.id)
    .select()
    .single();
  if (updateError !== null) throw new HttpError(500, "No se pudo actualizar el estado.");

  return json(200, { pagare: updated });
});
