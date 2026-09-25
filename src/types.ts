// Los tipos de la tabla viven junto a las funciones para que haya una sola
// definición; la app los reexporta desde acá.
export type {
  Database,
  DeudorKind,
  PagareInsert,
  PagareRow,
  PagareState,
  PagareUpdate,
} from "../supabase/functions/_shared/types.ts";
