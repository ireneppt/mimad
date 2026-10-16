// Aviso cuando un plan coincide con otro de su agenda el mismo día a la misma hora.
// No se apunta hasta que elige: quedarse con el que tenía, cambiar al nuevo o ir a los dos.
import Link from "next/link";
import { ArrowRightLeft, Check, TriangleAlert } from "lucide-react";
import type { Evento } from "@/lib/data";
import { whenInWords } from "@/lib/simplePlans";
import { joinPlan, swapPlan } from "@/app/simple/planes/actions";

export default function ConflictChoice({ nuevo, existente, back }: { nuevo: Evento; existente: Evento; back: string }) {
  return (
    <section
      role="alert"
      aria-labelledby="choque"
      className="flex flex-col gap-4 rounded-3xl border-4 border-amber-600 bg-amber-50 p-5 text-xl leading-snug"
    >
      <h2 id="choque" className="flex items-start gap-3 text-2xl font-bold">
        <TriangleAlert size={34} className="shrink-0 text-amber-700" aria-hidden="true" />
        Ese día ya tienes otro plan a la misma hora
      </h2>
      <div className="rounded-2xl bg-white p-4">
        <p className="text-base font-bold uppercase tracking-wide text-gris">Ya tienes este plan</p>
        <p className="font-bold">{existente.titulo}</p>
        <p>{whenInWords(existente)}</p>
      </div>
      <div className="rounded-2xl bg-white p-4">
        <p className="text-base font-bold uppercase tracking-wide text-gris">Y quieres apuntarte a este</p>
        <p className="font-bold">{nuevo.titulo}</p>
        <p>{whenInWords(nuevo)}</p>
      </div>
      <p className="font-bold">¿Qué prefieres?</p>

      <Link
        href={back}
        className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-tinta bg-white px-4 py-2 text-center text-xl font-bold"
      >
        <Check size={26} className="shrink-0" aria-hidden="true" />
        Quedarme con «{existente.titulo}»
      </Link>
      <form action={swapPlan}>
        <input type="hidden" name="evento_id" value={nuevo.id} />
        <input type="hidden" name="quitar_id" value={existente.id} />
        <input type="hidden" name="back" value={back} />
        <button
          type="submit"
          className="bg-degradado-fuerte flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-4 py-2 text-center text-xl font-bold text-white"
        >
          <ArrowRightLeft size={26} className="shrink-0" aria-hidden="true" />
          Cambiar a «{nuevo.titulo}»
        </button>
      </form>
      <form action={joinPlan}>
        <input type="hidden" name="evento_id" value={nuevo.id} />
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="forzar" value="1" />
        <button type="submit" className="w-full py-2 text-lg font-semibold underline">
          Apuntarme a los dos igualmente
        </button>
      </form>
    </section>
  );
}
