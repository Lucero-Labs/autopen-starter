import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { missingEnv, supabase } from "./lib/supabase";
import NewPagare from "./pages/NewPagare";
import Pagares from "./pages/Pagares";
import SignIn from "./pages/SignIn";

/** Sesión y navegación: sin sesión se ve el ingreso; con sesión, la lista o el formulario. */
export default function App() {
  // undefined: todavía no sabemos; null: nadie ingresó.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<"list" | "new">("list");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (missingEnv.length > 0) {
    return (
      <main className="mx-auto mt-24 max-w-md rounded-lg border bg-white p-6 text-sm shadow-sm">
        <p>Falta configurar el archivo <code>.env</code>: {missingEnv.join(", ")}.</p>
        <p className="mt-2 text-gray-600">Copiá <code>.env.example</code> a <code>.env</code> y completá los valores.</p>
      </main>
    );
  }
  if (session === undefined) return null;
  if (session === null) return <SignIn />;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pagarés</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{session.user.email}</span>
          <button type="button" onClick={() => supabase.auth.signOut()} className="underline">
            Salir
          </button>
        </div>
      </header>

      {view === "new" ? (
        <NewPagare userId={session.user.id} onCreated={() => setView("list")} onCancel={() => setView("list")} />
      ) : (
        <Pagares onNew={() => setView("new")} />
      )}
    </div>
  );
}
