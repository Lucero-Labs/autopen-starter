// Lo único de Deno que usan estas funciones, declarado para que
// `npx tsc --noEmit` desde la raíz del proyecto pueda revisarlas.
// Deno nunca carga este archivo: nada lo importa y Deno trae sus propios tipos.

declare const Deno: {
  readonly env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
