# autopen-starter

Una app mínima para emitir pagarés y mandarlos a firmar a través del servicio
de firma de Autopen, guardando la copia firmada. Pensada para abrirse en
Lovable o Replit y adaptarse desde ahí: Vite + React + Tailwind en el
navegador, Supabase para usuarios, base de datos, archivos y las dos funciones
que hablan con el servicio.

Las reglas legales están en `src/lib/pagare-rules.ts`; cambiarlas requiere
revisión de un abogado.

## Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com). En *Authentication → Providers*
   dejar Email activo (enlace mágico) y, si se quiere, habilitar Google.
2. Correr la migración: `supabase link --project-ref <ref>` y `supabase db push`
   (o pegar `supabase/migrations/0001_pagares.sql` en el SQL Editor).
3. Desplegar las funciones: `supabase functions deploy create-instrument` y
   `supabase functions deploy refresh-instrument`. Si las funciones responden 401
   antes de ejecutarse, poné `verify_jwt = false` en supabase/config.toml: las
   funciones verifican la sesión igual con auth.getUser().
4. Cargar los dos secretos, una sola vez y nunca en un archivo:
   `supabase secrets set AUTOPEN_BASE_URL=https://... AUTOPEN_API_KEY=...`
5. Copiar `.env.example` a `.env`, completar `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY`, y correr `npm install` y `npm run dev`.

## Lo que hace

- Ingreso por enlace al correo o con Google; cada usuario ve solo lo suyo.
- Carga los datos del pagaré, aplica las reglas, arma el PDF y lo manda a
  firmar; muestra el enlace para el deudor.
- Consulta el estado cada 30 segundos y a pedido; al firmarse, guarda la copia
  firmada y la deja para descargar.

## Lo que no hace

- No le manda el enlace al deudor: se copia y se envía por donde se quiera.
- No escribe el monto en letras ni calcula intereses ni cuotas.
- No recibe avisos del servicio (webhooks): pregunta, no escucha.
- No tiene roles ni equipos: un usuario, sus pagarés.
