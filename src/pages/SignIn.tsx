import { useState, type FormEvent } from "react";

import { supabase } from "../lib/supabase";

/** Ingreso por enlace mágico al correo, o con Google si el proveedor está habilitado en Supabase. */
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    setMessage(error === null ? "Te enviamos un enlace a tu correo." : `No se pudo enviar el enlace: ${error.message}`);
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error !== null) setMessage(`No se pudo ingresar con Google: ${error.message}`);
  }

  return (
    <main className="mx-auto mt-24 max-w-sm rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Pagarés</h1>
      <p className="mt-1 text-sm text-gray-600">Ingresá con tu correo para gestionar tus pagarés.</p>

      <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
        <input
          type="email"
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          Enviar enlace de ingreso
        </button>
      </form>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="mt-3 w-full rounded border px-3 py-2 hover:bg-gray-50"
      >
        Continuar con Google
      </button>

      {message !== null && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </main>
  );
}
