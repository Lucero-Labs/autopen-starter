import { createClient, FunctionsHttpError } from "@supabase/supabase-js";

import type { Database } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Las variables de .env que faltan. Vacío cuando la app está configurada. */
export const missingEnv: readonly string[] = [
  ...(typeof url !== "string" || url === "" ? ["VITE_SUPABASE_URL"] : []),
  ...(typeof anonKey !== "string" || anonKey === "" ? ["VITE_SUPABASE_ANON_KEY"] : []),
];

/**
 * El cliente de Supabase de la app. La clave anon es pública; las políticas
 * RLS protegen los datos. Sin configuración se crea con valores de relleno
 * para que la app pueda mostrar qué falta en vez de fallar al cargar.
 */
export const supabase = createClient<Database>(
  typeof url === "string" && url !== "" ? url : "https://example.supabase.co",
  typeof anonKey === "string" && anonKey !== "" ? anonKey : "sin-configurar",
);

/**
 * Llama a una función de Supabase y devuelve su respuesta. Cuando la función
 * contesta con error, su cuerpo trae { error: "mensaje en español" }; ese
 * mensaje es el que se le muestra al usuario.
 */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error === null && data !== null) return data;

  if (error instanceof FunctionsHttpError) {
    const detail: unknown = await error.context.json().catch(() => null);
    if (typeof detail === "object" && detail !== null) {
      const message = (detail as { error?: unknown }).error;
      if (typeof message === "string") throw new Error(message);
    }
  }
  throw new Error(`No se pudo llamar a la función ${name}. ¿Está desplegada?`);
}
