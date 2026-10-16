"use client";

// "Dejar de acompañar a Carmen" con confirmación dentro de la pantalla
import { useState } from "react";
import { stopAccompanying } from "./actions";

export default function StopConfirm({ vinculoId, nombre }: { vinculoId: string; nombre: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="w-full py-2 text-center font-semibold text-coral-texto underline-offset-4 hover:underline">
        Dejar de acompañar a {nombre}
      </button>
    );
  }
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
      <p>
        ¿Seguro? Dejarás de ver los planes de {nombre} y no podrás recomendarle más. Para volver, tendrás que enviarle un código nuevo.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setAsking(false)} className="h-12 rounded-2xl border border-slate-300 bg-white font-semibold">
          No, seguir
        </button>
        <form action={stopAccompanying}>
          <input type="hidden" name="id" value={vinculoId} />
          <button type="submit" className="h-12 w-full rounded-2xl bg-red-700 font-semibold text-white">
            Sí, dejar
          </button>
        </form>
      </div>
    </div>
  );
}
