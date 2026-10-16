"use client";

// Cancelar un plan, con confirmación (se avisa a las personas apuntadas)
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Ban, LoaderCircle } from "lucide-react";
import { cancelEvent } from "../../actions";

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-800 font-semibold text-white disabled:opacity-70">
      {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />} Sí, cancelar el plan
    </button>
  );
}

export default function CancelEvent({ id, apuntados }: { id: string; apuntados: number }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white text-base font-semibold text-red-800">
        <Ban size={18} aria-hidden="true" /> Cancelar el plan
      </button>
    );
  }
  return (
    <form action={cancelEvent} className="flex flex-col gap-3 rounded-3xl border border-red-200 bg-red-50 p-5">
      <input type="hidden" name="id" value={id} />
      <p className="text-base text-red-950">
        {apuntados > 0
          ? `Avisaremos a ${apuntados === 1 ? "la persona apuntada" : `las ${apuntados} personas apuntadas`} de que se cancela. No se puede deshacer.`
          : "El plan dejará de aparecer en la app. No se puede deshacer."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Confirm />
        <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-2xl border border-slate-300 bg-white font-medium">
          No, mantenerlo
        </button>
      </div>
    </form>
  );
}
