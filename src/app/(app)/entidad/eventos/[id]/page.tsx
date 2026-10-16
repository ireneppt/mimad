import Link from "next/link";
import { notFound } from "next/navigation";
import { Accessibility, Ban, CalendarDays, Database, Euro, MapPin, PartyPopper, Pencil, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { ENTITY_AUDIENCES, ENTITY_CATEGORIES, getEntityEvent, getMyEntity, isPast } from "@/lib/entityEvents";
import { categoryInfo } from "@/lib/categories";
import { formatLongDate } from "@/lib/format";
import BackButton from "@/components/BackButton";
import RouteMapLazy from "@/components/simple/RouteMapLazy";
import EventForm from "../../EventForm";
import CancelEvent from "./CancelEvent";
import { Attendance, StatusPill } from "../../parts";
import type { Evento } from "@/lib/data";

export const metadata = { title: "Tu plan · MiMad" };

// Detalle de un plan de la entidad: cómo va (personas apuntadas), editarlo y cancelarlo.
// La entidad solo ve CUÁNTAS personas se han apuntado, no quiénes (privacidad).
export default async function EntityEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string; cancelado?: string }>;
}) {
  const { id } = await params;
  const { nuevo, cancelado } = await searchParams;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null;
  const entidad = await getMyEntity(supabase, perfil.id);
  if (!entidad) notFound();
  const [e, { data: municipios }] = await Promise.all([
    getEntityEvent(supabase, entidad.id, id),
    supabase.from("v_municipios").select("nombre").order("nombre"),
  ]);
  if (!e) notFound();

  const { label, icon: Icon } = categoryInfo(e.categoria);
  const kind = ENTITY_CATEGORIES.find((c) => c.value === e.categoria)?.label ?? label;
  const audience = ENTITY_AUDIENCES.find((a) => a.value === e.publico)?.label;
  const past = isPast(e);
  const editable = !past && e.estado !== "cancelado" && e.estado !== "rechazado";
  const date = formatLongDate({ fecha_inicio: e.fecha_inicio } as Evento);

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <BackButton fallback="/entidad/agenda" />
        <h1 className="flex-1 text-2xl font-bold">Tu plan</h1>
      </header>

      <div className="flex flex-col gap-5 bg-fondo px-5 pb-10 pt-5">
        {nuevo && (
          <p role="status" className="flex items-start gap-3 rounded-2xl bg-tinta p-4 text-base text-white">
            <PartyPopper size={24} className="mt-0.5 shrink-0 text-ambar" aria-hidden="true" />
            <span>
              <strong className="block text-lg">{e.estado === "publicado" ? "¡Plan publicado!" : "Plan guardado"}</strong>
              {e.estado === "publicado" ? "Ya aparece en el Inicio y en el Mapa de las personas cercanas." : "Se publicará cuando revisemos tu entidad."}
            </span>
          </p>
        )}
        {cancelado && <p role="status" className="rounded-2xl bg-slate-100 p-4 text-base">Has cancelado el plan. Hemos avisado a las personas apuntadas.</p>}

        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <span className="bg-degradado flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white" aria-hidden="true">
              <Icon size={28} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-coral-texto">{kind}</p>
              <h2 className="text-2xl font-bold leading-tight text-balance">{e.titulo}</h2>
              <div className="mt-1 flex flex-wrap gap-2">
                <StatusPill estado={e.estado} />
                {past && <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-700">Ya ha pasado</span>}
              </div>
            </div>
          </div>

          {/* Cómo va: solo el número de personas (no quiénes) */}
          <div className="rounded-2xl bg-crema p-4">
            <Attendance apuntados={e.apuntados} plazas={e.plazas} big />
            <p className="mt-2 text-sm text-gris">Por privacidad solo ves cuántas personas se han apuntado, no quiénes.</p>
          </div>

          <ul className="flex flex-col gap-3 text-base">
            <li className="flex items-start gap-3">
              <CalendarDays size={20} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>{date}{e.fecha_fin ? ` – ${e.fecha_fin.slice(11, 16)}` : ""}</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>{[e.direccion, e.municipio].filter(Boolean).join(", ")}</span>
            </li>
            <li className="flex items-start gap-3">
              <Euro size={20} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>{e.gratuito ? "Gratis" : e.precio}</span>
            </li>
            {audience && (
              <li className="flex items-start gap-3">
                <Users size={20} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
                <span>Para {audience.toLowerCase()}</span>
              </li>
            )}
            {e.accesible && (
              <li className="flex items-start gap-3 text-green-800">
                <Accessibility size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>Lugar accesible</span>
              </li>
            )}
          </ul>
          {e.descripcion && <p className="whitespace-pre-line text-base text-gris">{e.descripcion}</p>}

          {e.lat != null && e.lon != null && (
            <RouteMapLazy home={null} place={{ lat: e.lat, lon: e.lon }} homeLabel="" />
          )}
          <p className="flex items-center gap-1.5 text-sm text-gris">
            <Database size={14} aria-hidden="true" /> Las personas lo ven con la fuente «Planes publicados por entidades en MiMad»
            {entidad.verificada ? " y la marca «Entidad verificada»." : "."}
          </p>
        </section>

        {editable && (
          <details className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" open={false}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-semibold">
              <Pencil size={20} className="text-coral-texto" aria-hidden="true" /> Editar el plan
            </summary>
            <p className="mt-2 text-sm text-gris">Si cambias la fecha o el lugar, avisaremos a las personas apuntadas.</p>
            <div className="mt-4">
              <EventForm evento={e} municipios={(municipios ?? []).map((m) => m.nombre as string)} />
            </div>
          </details>
        )}

        {editable && <CancelEvent id={e.id} apuntados={e.apuntados} />}

        {e.estado === "cancelado" && (
          <p className="flex items-center gap-2 rounded-2xl bg-slate-100 p-4 text-base">
            <Ban size={20} aria-hidden="true" /> Este plan está cancelado: ya no aparece en la app.
          </p>
        )}

        <Link href="/entidad/nuevo" className="flex h-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-lg font-semibold">
          Publicar otro plan
        </Link>
      </div>
    </main>
  );
}
