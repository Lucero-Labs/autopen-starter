-- Un pagaré por fila: sus datos, el PDF generado, quién lo firma (el deudor)
-- y qué respondió el servicio de firma. Cada usuario ve y toca únicamente
-- sus propias filas.

create table public.pagares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  beneficiario text not null,
  monto_centavos bigint not null check (monto_centavos > 0),  -- centavos enteros, nunca decimales
  cuotas int check (cuotas > 0),
  lugar_de_pago text not null,
  fecha_vencimiento date not null,
  deudor_nombre text not null,
  deudor_dni text not null,
  deudor_domicilio text not null,
  deudor_kind text not null check (deudor_kind in ('fisica', 'juridica')),
  integracion_de_consumo text,     -- obligatoria cuando el deudor es persona física (regla)
  signer_email text not null,      -- el correo del deudor
  signer_phone text,               -- el teléfono del deudor
  pdf_path text not null,          -- ruta en el bucket "documents": {user_id}/{id}.pdf
  file_name text not null,         -- pagare-{id}.pdf
  instrument_id text,              -- id que devuelve el servicio de firma; null hasta enviarlo
  signing_url text,                -- enlace que se le manda al deudor
  state text not null default 'awaiting-signature'
    check (state in ('awaiting-signature', 'signed')),
  signed_path text,                -- ruta en el bucket "signed" una vez firmado
  created_at timestamptz not null default now()
);

alter table public.pagares enable row level security;

create policy "pagares: ver los propios"
  on public.pagares for select
  using (auth.uid() = user_id);

create policy "pagares: crear los propios"
  on public.pagares for insert
  with check (auth.uid() = user_id);

create policy "pagares: actualizar los propios"
  on public.pagares for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pagares: borrar los propios"
  on public.pagares for delete
  using (auth.uid() = user_id);

-- Dos buckets privados. El primer segmento de la ruta es el user_id del dueño,
-- y eso es lo único que las políticas miran.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('signed', 'signed', false);

create policy "documents bucket: carpeta propia"
  on storage.objects for all
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "signed bucket: carpeta propia"
  on storage.objects for all
  using (bucket_id = 'signed' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'signed' and (storage.foldername(name))[1] = auth.uid()::text);
