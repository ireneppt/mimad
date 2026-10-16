"use client";

// "Ya no puedo ir" con confirmación dentro de la pantalla (sin ventanas emergentes):
// primer toque → pregunta; "Sí, quitar el plan" borra la inscripción.
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, X } from "lucide-react";
import { leavePlan } from "@/app/simple/planes/actions";

function ConfirmSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-red-700 text-xl font-bold text-white disabled:opacity-70"
    >
      {pending ? <LoaderCircle className="animate-spin" size={26} aria-hidden="true" /> : <X size={26} aria-hidden="true" />}
      {pending ? "Un momento…" : "Sí, quitar el plan"}
    </button>
  );
}

export default function LeaveConfirm({ eventoId, titulo, back }: { eventoId: string; titulo: string; back: string }) {
  const [asking, setAsking] = useState(false);
  const questionRef = useRef<HTMLParagraphElement>(null);

  // Al preguntar, el foco va a la pregunta (lectores de pantalla)
  useEffect(() => {
    if (asking) questionRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-700 bg-white text-xl font-bold text-red-800"
      >
        <X size={26} aria-hidden="true" />
        Ya no puedo ir
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-red-700 bg-red-50 p-5">
      <p ref={questionRef} tabIndex={-1} className="text-xl leading-snug focus:outline-none">
        ¿Seguro que no puedes ir a <strong>{titulo}</strong>? Lo quitaremos de tus planes.
      </p>
      <form action={leavePlan}>
        <input type="hidden" name="evento_id" value={eventoId} />
        <input type="hidden" name="back" value={back} />
        <ConfirmSubmit />
      </form>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="flex h-16 w-full items-center justify-center rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
      >
        No, me quedo
      </button>
    </div>
  );
}
