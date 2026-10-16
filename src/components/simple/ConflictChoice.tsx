"use client";

// Aviso cuando un plan coincide con otro de su agenda el mismo día a la misma hora.
// No se apunta hasta que elige: quedarse con el que tenía, cambiar al nuevo o ir a los dos.
// "Quedarme" es instantáneo (no va al servidor); los otros dos muestran "Un momento…" al tocarlos.
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRightLeft, Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { joinPlan, swapPlan } from "@/app/simple/planes/actions";

type PlanInfo = { id: string; titulo: string; cuando: string };

// Mientras un formulario se envía, todos los botones del aviso se bloquean
function Busy({ onChange }: { onChange: (busy: boolean) => void }) {
  const { pending } = useFormStatus();
  useEffect(() => onChange(pending), [pending, onChange]);
  return null;
}

function SubmitButton({ busy, className, children }: { busy: boolean; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={busy} aria-busy={pending} className={`${className} disabled:opacity-60`}>
      {pending ? (
        <>
          <LoaderCircle size={26} className="shrink-0 animate-spin" aria-hidden="true" />
          Un momento…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default function ConflictChoice({ nuevo, existente, back }: { nuevo: PlanInfo; existente: PlanInfo; back: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // El foco va al aviso para que los lectores de pantalla lo lean
  useEffect(() => headingRef.current?.focus(), []);

  if (dismissed) return null;

  function keep() {
    setDismissed(true);
    // Quita el aviso de la dirección sin recargar la pantalla ni ir al servidor
    window.history.replaceState(null, "", back);
  }

  return (
    <section
      role="alert"
      aria-labelledby="choque"
      className="flex flex-col gap-4 rounded-3xl border-4 border-amber-600 bg-amber-50 p-5 text-xl leading-snug"
    >
      <h2 id="choque" ref={headingRef} tabIndex={-1} className="flex items-start gap-3 text-2xl font-bold focus:outline-none">
        <TriangleAlert size={34} className="shrink-0 text-amber-700" aria-hidden="true" />
        Ese día ya tienes otro plan a la misma hora
      </h2>
      <div className="rounded-2xl bg-white p-4">
        <p className="text-base font-bold uppercase tracking-wide text-gris">Ya tienes este plan</p>
        <p className="font-bold">{existente.titulo}</p>
        <p>{existente.cuando}</p>
      </div>
      <div className="rounded-2xl bg-white p-4">
        <p className="text-base font-bold uppercase tracking-wide text-gris">Y quieres apuntarte a este</p>
        <p className="font-bold">{nuevo.titulo}</p>
        <p>{nuevo.cuando}</p>
      </div>
      <p className="font-bold">¿Qué prefieres?</p>

      <button
        type="button"
        onClick={keep}
        disabled={busy}
        className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-tinta bg-white px-4 py-2 text-center text-xl font-bold disabled:opacity-60"
      >
        <Check size={26} className="shrink-0" aria-hidden="true" />
        Quedarme con «{existente.titulo}»
      </button>
      <form action={swapPlan}>
        <Busy onChange={setBusy} />
        <input type="hidden" name="evento_id" value={nuevo.id} />
        <input type="hidden" name="quitar_id" value={existente.id} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton
          busy={busy}
          className="bg-degradado-fuerte flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-4 py-2 text-center text-xl font-bold text-white"
        >
          <ArrowRightLeft size={26} className="shrink-0" aria-hidden="true" />
          Cambiar a «{nuevo.titulo}»
        </SubmitButton>
      </form>
      <form action={joinPlan}>
        <Busy onChange={setBusy} />
        <input type="hidden" name="evento_id" value={nuevo.id} />
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="forzar" value="1" />
        <SubmitButton busy={busy} className="flex w-full items-center justify-center gap-3 py-2 text-lg font-semibold underline">
          Apuntarme a los dos igualmente
        </SubmitButton>
      </form>
    </section>
  );
}
