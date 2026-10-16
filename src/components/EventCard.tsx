// Tarjeta de evento de la versión por defecto (diseño inicio.png)
import Link from "next/link";
import { Accessibility } from "lucide-react";
import { isAccessible, type Evento, type Fuente } from "@/lib/data";
import { categoryInfo } from "@/lib/categories";
import { formatDistance, formatWhen } from "@/lib/format";
import SourceTag from "./SourceTag";
import EventImage, { photoCredit } from "./EventImage";

export function eventHref(id: string) {
  return `/evento/${encodeURIComponent(id)}`;
}

export default function EventCard({
  evento, fuente, distanceKm,
}: {
  evento: Evento;
  fuente?: Fuente;
  distanceKm?: number;
}) {
  const { label } = categoryInfo(evento.categoria);
  const when = formatWhen(evento);
  const accessible = isAccessible(evento);

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Foto del plan o, si no tiene, el icono de su tipo sobre el degradado de la marca */}
      <EventImage src={evento.imagen} categoria={evento.categoria} className="h-40" credit={photoCredit(evento.fuente)}>
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-coral-texto shadow-sm">
          {label}
        </span>
      </EventImage>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold leading-snug">
            <Link href={eventHref(evento.id)} className="after:absolute after:inset-0 focus:outline-none">
              {evento.titulo}
            </Link>
          </h3>
          {evento.gratuito && <span className="shrink-0 text-lg font-semibold text-coral-texto">Gratis</span>}
        </div>

        {(evento.lugar || evento.direccion) && (
          <p className="line-clamp-2 text-base text-gris">{evento.lugar ?? evento.direccion}</p>
        )}

        {accessible && (
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm">
            <Accessibility size={16} aria-hidden="true" /> Accesible
          </span>
        )}

        <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <SourceTag fuente={fuente} label={fuente ? undefined : evento.fuente} className="relative z-10 max-w-[60%]" />
          <p className="text-right">
            <span className="block text-sm text-gris">{when.day}</span>
            <span className="text-lg font-bold">
              {[when.time, distanceKm !== undefined ? formatDistance(distanceKm) : null].filter(Boolean).join(" · ")}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
