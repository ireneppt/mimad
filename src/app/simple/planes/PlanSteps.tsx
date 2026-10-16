"use client";

// Planes de uno en uno. Los 10 planes llegan ya cargados, así que "Ver otro plan"
// cambia al instante (sin esperar al servidor), sube a la tarjeta y avisa al lector de pantalla.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Accessibility, ArrowLeft, ArrowRight, Check, Clock, Euro, Heart, Info, MapPin, RotateCcw, Sparkles } from "lucide-react";
import { PrimarySubmit } from "@/components/simple/ui";
import SourceTag from "@/components/SourceTag";
import { categoryInfo } from "@/lib/categories";
import type { Fuente } from "@/lib/data";
import { joinPlan } from "./actions";

// Todo ya preparado en el servidor (textos de fecha y distancia incluidos)
export type PlanView = {
  id: string;
  titulo: string;
  categoria: string | null;
  cuando: string;
  lugar: string | null;
  minutosAndando: number | null;
  precio: string;
  accesible: boolean;
  recomendadoPor: string | null;
  mensaje: string | null; // mensaje del familiar que lo recomienda
  porque: string; // "Te lo proponemos porque te gusta la música y es gratis."
  fuente: Fuente | null;
  fuenteId: string;
  apuntada: boolean;
};

export default function PlanSteps({ plans, initial, cuando }: { plans: PlanView[]; initial: number; cuando: string }) {
  const [index, setIndex] = useState(initial);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const total = plans.length;
  const plan = plans[index];

  // Al cambiar de plan: se sube a la tarjeta, el foco va al título y la dirección guarda la posición
  useEffect(() => {
    if (!moved.current) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
    window.history.replaceState(null, "", `/simple/planes?cuando=${cuando}${index ? `&n=${index}` : ""}`);
  }, [index, cuando]);

  function go(n: number) {
    moved.current = true;
    setIndex((n + total) % total);
  }

  const { label, icon: CategoryIcon } = categoryInfo(plan.categoria);
  const back = `/simple/planes?cuando=${cuando}${index ? `&n=${index}` : ""}`;
  const last = index === total - 1;

  return (
    <>
      {/* key: al cambiar de plan la tarjeta se vuelve a pintar con una entrada suave */}
      <article
        key={plan.id}
        ref={cardRef}
        className="motion-safe:animate-[aparecer_250ms_ease-out] scroll-mt-4 overflow-hidden rounded-3xl border-2 border-slate-300 bg-white"
        aria-label={`Plan ${index + 1} de ${total}`}
      >
        {/* Los datos abiertos no traen imagen: fondo de marca con el icono de la categoría */}
        <div className="bg-degradado relative flex h-40 items-center justify-center">
          <CategoryIcon size={72} className="text-white" aria-hidden="true" />
          {plan.recomendadoPor ? (
            <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto">
              <Heart size={20} aria-hidden="true" /> Te lo recomienda {plan.recomendadoPor}
            </span>
          ) : (
            <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto">{label}</span>
          )}
          <span className="absolute bottom-3 right-4 rounded-full bg-tinta/85 px-3 py-1 text-lg font-semibold text-white">
            Plan {index + 1} de {total}
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <h2 ref={headingRef} tabIndex={-1} className="text-[1.75rem] font-bold leading-tight focus:outline-none">
            {plan.titulo}
          </h2>

          {/* Por qué se le propone: gustos, cercanía, recomendación de la familia... */}
          <div className="flex gap-3 rounded-2xl bg-crema p-4 text-xl leading-snug">
            <Sparkles size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
            <div>
              <p className="font-bold">¿Por qué este plan?</p>
              <p>{plan.porque}</p>
              {plan.mensaje && (
                <p className="mt-2 italic">
                  «{plan.mensaje}»<span className="not-italic"> — {plan.recomendadoPor}</span>
                </p>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-3 text-xl leading-snug">
            <li className="flex gap-3">
              <Clock size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>{plan.cuando}</span>
            </li>
            {plan.lugar && (
              <li className="flex gap-3">
                <MapPin size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
                <span>
                  {plan.lugar}
                  {plan.minutosAndando != null && <strong className="block">A {plan.minutosAndando} minutos andando</strong>}
                </span>
              </li>
            )}
            <li className="flex gap-3">
              <Euro size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>{plan.precio}</span>
            </li>
            {plan.accesible && (
              <li className="flex gap-3">
                <Accessibility size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
                <span>Accesible en silla de ruedas</span>
              </li>
            )}
          </ul>

          {plan.apuntada ? (
            <p className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-xl font-bold text-green-800">
              <Check size={30} strokeWidth={3} aria-hidden="true" />
              Ya te has apuntado a este plan.
            </p>
          ) : (
            <form action={joinPlan}>
              <input type="hidden" name="evento_id" value={plan.id} />
              <input type="hidden" name="back" value={back} />
              <PrimarySubmit>Me apunto</PrimarySubmit>
            </form>
          )}

          <Link
            href={`/simple/evento/${encodeURIComponent(plan.id)}?volver=${encodeURIComponent(back)}`}
            className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 text-xl font-semibold"
          >
            <Info size={26} aria-hidden="true" />
            Ver más información
          </Link>

          <SourceTag
            fuente={plan.fuente ?? undefined}
            label={plan.fuente ? undefined : plan.fuenteId}
            className="border-t-2 border-slate-100 pt-4 !text-lg !text-tinta"
          />
        </div>
      </article>

      {total > 1 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-tinta bg-white text-xl font-bold active:bg-slate-100"
          >
            {last ? (
              <>
                <RotateCcw size={26} aria-hidden="true" />
                Volver al primer plan
              </>
            ) : (
              <>
                Ver otro plan
                <ArrowRight size={26} aria-hidden="true" />
              </>
            )}
          </button>
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl text-xl font-semibold underline"
            >
              <ArrowLeft size={24} aria-hidden="true" />
              Plan anterior
            </button>
          )}
        </div>
      )}
    </>
  );
}
