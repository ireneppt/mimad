import Link from "next/link";
import { Bell, Building2, CalendarPlus, Clock, Database, ExternalLink, PartyPopper, ShieldAlert, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getSources } from "@/lib/data";
import Avatar from "@/components/Avatar";
import EntityForm from "./EntityForm";
import { EventRow } from "./parts";
import { getEntityEvents, isPast } from "@/lib/entityEvents";

export const metadata = { title: "Panel de tu entidad · MiMad" };

// Panel de la entidad: estado de la verificación del NIF (con su fuente de datos abiertos)
// y acceso a publicar planes (tarea A10).
export default async function EntityPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { nueva } = await searchParams;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null; // el middleware ya obliga a tener cuenta

  const [{ data: entidad }, fuentes] = await Promise.all([
    supabase.from("mm_entidades").select("id, nombre, nif, nombre_oficial, verificada, created_at").eq("usuario", perfil.id).maybeSingle(),
    getSources(),
  ]);
  const registro = fuentes["centros_atencion_social"];
  const events = entidad ? await getEntityEvents(supabase, entidad.id) : [];
  const upcoming = events.filter((e) => !isPast(e) && e.estado !== "cancelado");
  const totalApuntados = upcoming.reduce((n, e) => n + e.apuntados, 0);

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <h1 className="flex-1 pl-3 text-2xl font-bold">Panel de tu entidad</h1>
        <Link href="/notificaciones" aria-label="Notificaciones" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Bell size={22} aria-hidden="true" />
        </Link>
      </header>

      <div className="flex flex-col gap-6 bg-fondo px-5 pb-10 pt-5">
        {nueva && (
          <p role="status" className="flex items-start gap-3 rounded-2xl bg-tinta p-4 text-base text-white">
            <PartyPopper size={24} className="mt-0.5 shrink-0 text-ambar" aria-hidden="true" />
            <span>
              <strong className="block text-lg">¡Cuenta de entidad creada!</strong>
              Ya puedes publicar planes para la gente de tu barrio.
            </span>
          </p>
        )}

        {!entidad ? (
          <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Building2 size={22} className="text-coral-texto" aria-hidden="true" /> Datos de tu entidad
            </h2>
            <p className="text-base text-gris">Para publicar planes necesitamos el nombre y el NIF de tu entidad.</p>
            <EntityForm nombre={perfil.nombre} nif="" />
          </section>
        ) : (
          <>
            <section className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <Avatar url={perfil.foto_url} name={entidad.nombre} size={64} />
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">{entidad.nombre}</p>
                <p className="text-base tracking-wider text-gris">NIF {entidad.nif}</p>
              </div>
            </section>

            {/* Estado de la verificación, con la fuente de datos abiertos */}
            <section
              aria-labelledby="verificacion"
              className={`flex flex-col gap-3 rounded-3xl p-5 ${entidad.verificada ? "bg-green-50 ring-1 ring-green-200" : "bg-amber-50 ring-1 ring-amber-200"}`}
            >
              <h2 id="verificacion" className={`flex items-center gap-2 text-xl font-bold ${entidad.verificada ? "text-green-900" : "text-amber-950"}`}>
                {entidad.verificada ? <ShieldCheck size={26} aria-hidden="true" /> : <ShieldAlert size={26} aria-hidden="true" />}
                {entidad.verificada ? "Entidad verificada" : "Pendiente de revisión"}
              </h2>
              {entidad.verificada ? (
                <p className="text-base text-green-950">
                  Tu NIF aparece en el Registro oficial como <strong>{entidad.nombre_oficial}</strong>. Tus planes se publican al momento y llevan la marca
                  «Entidad verificada».
                </p>
              ) : (
                <p className="text-base text-amber-950">
                  Tu NIF no aparece en el Registro de centros de atención social. Puedes publicar planes igualmente, pero quedarán pendientes hasta que los
                  revisemos. Si te has equivocado al escribirlo, corrígelo abajo.
                </p>
              )}
              {registro && (
                <a href={registro.url_ficha} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-sm text-gris hover:underline">
                  <Database size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-medium">Fuente:</span> {registro.nombre} · {registro.organismo}
                    {registro.ultima_carga && ` · actualizado el ${new Date(registro.ultima_carga).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" })}`}
                  </span>
                  <ExternalLink size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                </a>
              )}
            </section>

            {/* Resumen de sus planes */}
            <ul className="grid grid-cols-3 divide-x divide-slate-100 rounded-3xl bg-white py-4 shadow-sm ring-1 ring-slate-200" aria-label="Resumen">
              {[
                [upcoming.length, upcoming.length === 1 ? "plan próximo" : "planes próximos"],
                [totalApuntados, totalApuntados === 1 ? "persona apuntada" : "personas apuntadas"],
                [events.filter((e) => e.estado !== "cancelado").length, "planes en total"],
              ].map(([n, label]) => (
                <li key={String(label)} className="flex flex-col items-center gap-1 px-1 text-center">
                  <span className="text-3xl font-bold">{n}</span>
                  <span className="text-sm leading-tight text-gris">{label}</span>
                </li>
              ))}
            </ul>

            <section className="flex flex-col gap-3" aria-labelledby="proximos">
              <div className="flex items-baseline justify-between">
                <h2 id="proximos" className="flex items-center gap-2 text-xl font-bold">
                  <CalendarPlus size={22} className="text-coral-texto" aria-hidden="true" /> Tus próximos planes
                </h2>
                {events.length > 0 && <Link href="/entidad/agenda" className="text-base font-semibold text-coral-texto">Ver agenda</Link>}
              </div>
              {upcoming.length === 0 ? (
                <p className="flex items-center gap-2 rounded-2xl bg-white p-4 text-base text-gris ring-1 ring-slate-200">
                  <Clock size={18} aria-hidden="true" /> {events.length === 0 ? "Aún no has publicado ningún plan." : "No tienes planes próximos."}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">{upcoming.slice(0, 3).map((e) => <EventRow key={e.id} e={e} />)}</ul>
              )}
              <Link href="/entidad/nuevo" className="bg-degradado flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-lg shadow-coral/25">
                <CalendarPlus size={22} aria-hidden="true" /> Publicar un plan
              </Link>
            </section>

            {!entidad.verificada && (
              <details className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-lg font-semibold">Corregir el nombre o el NIF</summary>
                <div className="mt-4">
                  <EntityForm nombre={entidad.nombre} nif={entidad.nif} />
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </main>
  );
}
