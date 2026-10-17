"use client";

// Lista de planes que se baja con el dedo, en dos partes:
// "Planes cerca de ti" (los más cercanos primero) y "Otros planes en Madrid" (por hora).
// Así la pantalla nunca se queda vacía si hay planes en otro sitio.
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Hint } from "@/components/simple/ui";
import PlanCard, { planAnchor, type PlanView } from "./PlanCard";

// "Otros planes" que se enseñan de primeras y cuántos más con cada "Ver más planes"
const STEP = 15;

export default function PlanList({
  nearby, others, back, emptyNearby,
}: {
  nearby: PlanView[];
  others: PlanView[];
  back: string; // dirección de esta pantalla (para volver tras "Me apunto")
  emptyNearby: string; // "Hoy no hay planes cerca de ti."
}) {
  const [shown, setShown] = useState(STEP);
  const [target, setTarget] = useState<string>();
  const visible = others.slice(0, shown);

  // Al volver de "Me apunto" o de "Ver más información" (#plan-…): se abre la lista hasta
  // ese plan (aunque estuviera en "Ver más planes") y se baja a su tarjeta
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("plan-")) return;
    const i = others.findIndex((p) => planAnchor(p.id) === id);
    if (i >= STEP) setShown(Math.ceil((i + 1) / STEP) * STEP);
    setTarget(id);
  }, [others]);

  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => document.getElementById(target)?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, [target, shown]);

  return (
    <>
      <section aria-labelledby="planes-cerca" className="flex flex-col gap-5">
        <h2 id="planes-cerca" className="text-[1.75rem] font-bold leading-tight">
          Planes cerca de ti
        </h2>
        {nearby.length > 0 ? (
          nearby.map((p) => <PlanCard key={p.id} plan={p} back={back} />)
        ) : (
          <Hint tone="info">{emptyNearby}</Hint>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="planes-otros" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 id="planes-otros" className="text-[1.75rem] font-bold leading-tight">
              Otros planes en Madrid
            </h2>
            <p className="text-xl text-gris">Más lejos de ti. Ordenados por la hora.</p>
          </div>
          {visible.map((p) => (
            <PlanCard key={p.id} plan={p} back={back} />
          ))}
          {shown < others.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + STEP)}
              className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-tinta bg-white text-xl font-bold"
            >
              <ChevronDown size={26} aria-hidden="true" />
              Ver más planes
            </button>
          )}
        </section>
      )}
    </>
  );
}
