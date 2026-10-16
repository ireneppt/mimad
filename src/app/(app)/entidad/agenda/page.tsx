import Link from "next/link";
import { CalendarPlus, CalendarX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getEntityEvents, getMyEntity, isPast, type EntityEventWithCount } from "@/lib/entityEvents";
import BackButton from "@/components/BackButton";
import { EventRow } from "../parts";

export const metadata = { title: "Agenda de tu entidad · MiMad" };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Agenda de la entidad: sus planes por mes (próximos), y aparte los pasados y cancelados
export default async function EntityAgendaPage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null;
  const entidad = await getMyEntity(supabase, perfil.id);
  const events = entidad ? await getEntityEvents(supabase, entidad.id) : [];

  const upcoming = events.filter((e) => !isPast(e) && e.estado !== "cancelado");
  const past = events.filter((e) => isPast(e) && e.estado !== "cancelado").reverse();
  const cancelled = events.filter((e) => e.estado === "cancelado");
  // Próximos agrupados por mes: "Octubre 2026"
  const byMonth = new Map<string, EntityEventWithCount[]>();
  upcoming.forEach((e) => {
    const key = `${MONTHS[Number(e.fecha_inicio.slice(5, 7)) - 1]} ${e.fecha_inicio.slice(0, 4)}`;
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  });

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <BackButton fallback="/entidad" />
        <h1 className="flex-1 text-2xl font-bold">Agenda de tus planes</h1>
      </header>

      <div className="flex flex-col gap-6 bg-fondo px-5 pb-10 pt-5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center">
            <CalendarX2 size={48} className="text-coral-texto" aria-hidden="true" />
            <p className="text-xl font-semibold">Aún no has publicado ningún plan</p>
            <p className="text-base text-gris">Publica tu primer taller, quedada o actividad y aparecerá aquí con las personas que se apunten.</p>
            <Link href="/entidad/nuevo" className="bg-degradado flex h-12 items-center gap-2 rounded-2xl px-6 text-lg font-semibold text-white">
              <CalendarPlus size={20} aria-hidden="true" /> Publicar un plan
            </Link>
          </div>
        ) : (
          <>
            {[...byMonth.entries()].map(([month, list]) => (
              <section key={month} className="flex flex-col gap-3" aria-labelledby={`m-${month}`}>
                <h2 id={`m-${month}`} className="text-sm font-semibold uppercase tracking-wider text-gris">{month}</h2>
                <ul className="flex flex-col gap-3">{list.map((e) => <EventRow key={e.id} e={e} />)}</ul>
              </section>
            ))}
            {upcoming.length === 0 && <p className="rounded-2xl bg-white p-5 text-base text-gris">No tienes planes próximos.</p>}

            {past.length > 0 && (
              <details className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-lg font-semibold">Ya pasados ({past.length})</summary>
                <ul className="mt-3 flex flex-col gap-3">{past.map((e) => <EventRow key={e.id} e={e} />)}</ul>
              </details>
            )}
            {cancelled.length > 0 && (
              <details className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-lg font-semibold">Cancelados ({cancelled.length})</summary>
                <ul className="mt-3 flex flex-col gap-3">{cancelled.map((e) => <EventRow key={e.id} e={e} />)}</ul>
              </details>
            )}
          </>
        )}
      </div>
    </main>
  );
}
