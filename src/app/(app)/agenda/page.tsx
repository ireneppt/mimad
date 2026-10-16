import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getMyAgenda, overlappingIds } from "@/lib/simpleAgenda";
import { categoryInfo } from "@/lib/categories";
import { niceText } from "@/lib/format";
import BackButton from "@/components/BackButton";
import AgendaView from "./AgendaView";
import type { AgendaPlan } from "./types";

export const metadata = { title: "Mi agenda · MiMad" };

// Agenda de la versión por defecto (diseño agenda.png). Con ?de=<id> se ve la agenda
// de una persona a la que acompañas (solo si el vínculo está aceptado: lo garantiza RLS).
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de } = await searchParams;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null; // el middleware ya obliga a tener cuenta

  // Personas a las que acompaño (pestañas "Agenda de …")
  const { data: vinculos } = await supabase.from("mm_vinculos").select("persona").eq("familiar", perfil.id).eq("estado", "aceptado");
  const ids = (vinculos ?? []).map((v) => v.persona as string);
  const { data: personas } = ids.length ? await supabase.from("mm_perfiles").select("id, nombre").in("id", ids) : { data: [] };
  const other = (personas ?? []).find((p) => p.id === de) ?? null;
  const ownerId = other?.id ?? perfil.id;

  const agenda = await getMyAgenda(supabase, ownerId);
  const clash = overlappingIds(agenda);
  const plans: AgendaPlan[] = agenda.map(({ evento, date, time, weekly }) => ({
    id: evento.id,
    title: evento.titulo,
    category: evento.categoria,
    label: categoryInfo(evento.categoria).label,
    date,
    time,
    weekly,
    weekday: weekly ? new Date(`${date}T12:00:00Z`).getUTCDay() : null,
    place: niceText(evento.lugar) ?? niceText(evento.direccion),
    lat: evento.lat,
    lon: evento.lon,
    overlaps: clash.has(evento.id),
  }));

  // Cuántas personas de MiMad van al próximo plan
  const next = plans[0];
  const { data: going } = next ? await supabase.rpc("contar_inscritos", { p_evento: next.id }) : { data: null };

  const tab = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex h-12 flex-1 items-center justify-center rounded-xl px-3 text-center text-base font-medium leading-tight ${on ? "bg-white shadow-sm" : "text-gris"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <BackButton />
        <h1 className="flex-1 text-2xl font-bold">Mi agenda</h1>
        <Link href="/notificaciones" aria-label="Notificaciones" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Bell size={22} aria-hidden="true" />
        </Link>
      </header>

      <div className="flex flex-col gap-5 bg-fondo px-5 pb-8 pt-4">
        {(personas ?? []).length > 0 && (
          <nav aria-label="De quién es la agenda" className="flex gap-1 rounded-2xl bg-slate-100 p-1">
            {tab("/agenda", "Mis planes", !other)}
            {(personas ?? []).map((p) => tab(`/agenda?de=${p.id}`, `Agenda de ${p.nombre}`, other?.id === p.id))}
          </nav>
        )}

        <AgendaView plans={plans} going={typeof going === "number" ? going : null} ownerName={other?.nombre ?? null} />
      </div>
    </main>
  );
}
