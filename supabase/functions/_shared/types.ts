// La forma de la tabla "pagares" (ver supabase/migrations/0001_pagares.sql),
// escrita a mano en el formato que espera supabase-js. La app la reexporta
// desde src/types.ts, así hay una sola definición.

export type PagareState = "awaiting-signature" | "signed";

export type DeudorKind = "fisica" | "juridica";

export type PagareRow = {
  id: string;
  user_id: string;
  beneficiario: string;
  monto_centavos: number;
  cuotas: number | null;
  lugar_de_pago: string;
  fecha_vencimiento: string;
  deudor_nombre: string;
  deudor_dni: string;
  deudor_domicilio: string;
  deudor_kind: DeudorKind;
  integracion_de_consumo: string | null;
  signer_email: string;
  signer_phone: string | null;
  pdf_path: string;
  file_name: string;
  instrument_id: string | null;
  signing_url: string | null;
  state: PagareState;
  signed_path: string | null;
  created_at: string;
};

export type PagareInsert = {
  id?: string;
  user_id: string;
  beneficiario: string;
  monto_centavos: number;
  cuotas?: number | null;
  lugar_de_pago: string;
  fecha_vencimiento: string;
  deudor_nombre: string;
  deudor_dni: string;
  deudor_domicilio: string;
  deudor_kind: DeudorKind;
  integracion_de_consumo?: string | null;
  signer_email: string;
  signer_phone?: string | null;
  pdf_path: string;
  file_name: string;
};

export type PagareUpdate = {
  instrument_id?: string | null;
  signing_url?: string | null;
  state?: PagareState;
  signed_path?: string | null;
};

export type Database = {
  public: {
    Tables: {
      pagares: {
        Row: PagareRow;
        Insert: PagareInsert;
        Update: PagareUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
