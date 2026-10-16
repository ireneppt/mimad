"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { useFormStatus } from "react-dom";
import { recommendPlan, type CompanionState } from "../actions";

function Submit({ nombre }: { nombre: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="bg-degradado flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold disabled:opacity-60">
      <Send size={20} aria-hidden="true" /> {pending ? "Enviando…" : `Recomendárselo a ${nombre}`}
    </button>
  );
}

export default function RecommendForm({ persona, evento, nombre }: { persona: string; evento: string; nombre: string }) {
  const [state, action] = useActionState<CompanionState, FormData>(recommendPlan, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="persona" value={persona} />
      <input type="hidden" name="evento" value={evento} />
      <label htmlFor="mensaje" className="font-semibold">
        Un mensaje para {nombre} <span className="font-normal text-gris">(opcional)</span>
      </label>
      <textarea
        id="mensaje"
        name="mensaje"
        rows={3}
        maxLength={500}
        placeholder="Por ejemplo: «Mamá, este te va a encantar. ¿Vamos juntas?»"
        className="rounded-2xl border border-slate-300 p-4 text-lg focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30"
      />
      {state.error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-red-800">{state.error}</p>}
      <Submit nombre={nombre} />
    </form>
  );
}
