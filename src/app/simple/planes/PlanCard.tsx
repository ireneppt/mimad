// Tarjeta de un plan en la lista de la versión simplificada: su foto (o una de su tipo),
// cuándo, dónde, precio, accesibilidad, "Me apunto" y de dónde viene el dato.
import Link from "next/link";
import { Accessibility, Check, Clock, Euro, Heart, Info, MapPin, Sparkles } from "lucide-react";
import EventImage from "@/components/EventImage";
import SourceTag from "@/components/SourceTag";
import { PrimarySubmit } from "@/components/simple/ui";
import { categoryInfo } from "@/lib/categories";
import type { Fuente } from "@/lib/data";
import { joinPlan } from "./actions";

// Todo ya preparado en el servidor (textos de fecha y distancia incluidos)
export type PlanView = {
  id: string;
  titulo: string;
  categoria: string | null;
  imagen: string | null;
  credito: string | null; // "Foto: esmadrid.com"
  foto?: string; // foto de su tipo si no tiene propia (elegida para no repetir la de al lado)
  cuando: string;
  lugar: string | null;
  distancia: string | null; // "A 9 minutos andando" o "A 6,2 km de tu casa"
  precio: string;
  accesible: boolean;
  recomendadoPor: string | null;
  mensaje: string | null; // mensaje del familiar que lo recomienda
  porque: string | null; // "Te lo proponemos porque te gusta la música y es gratis."
  fuente: Fuente | null;
  fuenteId: string;
  apuntada: boolean;
};

// Ancla de cada tarjeta: tras "Me apunto" se vuelve a la misma tarjeta
export const planAnchor = (id: string) => `plan-${id}`;

export default function PlanCard({ plan, back }: { plan: PlanView; back: string }) {
  const { label } = categoryInfo(plan.categoria);
  const backHere = `${back}#${planAnchor(plan.id)}`;

  return (
    <article id={planAnchor(plan.id)} className="scroll-mt-4 overflow-hidden rounded-3xl border-2 border-slate-300 bg-white">
      {/* Foto del plan si la tiene; si no (o si no carga), una de las fotos de su tipo */}
      <EventImage src={plan.imagen} categoria={plan.categoria} title={plan.titulo} fallback={plan.foto} className="h-44" iconSize={64} credit={plan.credito}>
        {plan.recomendadoPor ? (
          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto shadow">
            <Heart size={20} aria-hidden="true" /> Te lo recomienda {plan.recomendadoPor}
          </span>
        ) : (
          <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto shadow">{label}</span>
        )}
      </EventImage>

      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-[1.75rem] font-bold leading-tight">{plan.titulo}</h3>

        {/* Por qué se le propone: gustos, cercanía, recomendación de la familia... */}
        {plan.porque && (
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
        )}

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
                {plan.distancia && <strong className="block">{plan.distancia}</strong>}
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
            <input type="hidden" name="back" value={backHere} />
            <PrimarySubmit>Me apunto</PrimarySubmit>
          </form>
        )}

        <Link
          href={`/simple/evento/${encodeURIComponent(plan.id)}?volver=${encodeURIComponent(backHere)}`}
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
  );
}
