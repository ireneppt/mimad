import Link from "next/link";
import { Accessibility, Database } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { distanceKm, getEvents, getSources, sortByNext, type EventFilters, type Evento } from "@/lib/data";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { categoriesForInterests } from "@/lib/interests";
import EventCard from "@/components/EventCard";
import Welcome from "@/components/Welcome";
import HomeHeader from "@/components/HomeHeader";
import ViewToggle from "@/components/ViewToggle";

export const metadata = { title: "Inicio · MiMad" };

type Filter = "para-ti" | "cerca" | "gratis" | "accesible";
const PAGE = 20;

type Search = { bienvenida?: string; q?: string; f?: string; n?: string };

// Inicio de la versión por defecto (diseño inicio.png). Los filtros van en la dirección
// (?f=gratis,cerca&q=taller) para que se puedan compartir y volver atrás sin perderlos.
export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [perfil, fuentes] = await Promise.all([getCurrentProfile(supabase), getSources(supabase)]);
  const origin = await getOrigin(perfil);

  const search = (params.q ?? "").trim().slice(0, 60);
  const intereses = perfil?.intereses ?? [];
  // Sin elegir nada: "Para ti" si tiene intereses
  const active = new Set<Filter>(
    params.f !== undefined ? (params.f.split(",").filter(Boolean) as Filter[]) : intereses.length ? ["para-ti"] : []
  );
  const limit = Math.min(Number(params.n) || PAGE, 200);

  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const base: EventFilters = {
    search: search || undefined,
    free: active.has("gratis"),
    accessible: active.has("accesible"),
    categories: active.has("para-ti") && intereses.length ? categoriesForInterests(intereses) : undefined,
    // "Cerca de mí" = 2 km; si no, la zona de alrededor (10 km)
    near: { lat: origin.lat, lon: origin.lon, km: active.has("cerca") ? 2 : 10 },
  };
  // Dos consultas pequeñas: lo que empieza desde hoy y lo que ya está en marcha o es semanal
  const [upcoming, ongoing] = await Promise.all([
    getEvents(supabase, { ...base, startsFrom: today, limit: 200 }),
    getEvents(supabase, { ...base, startedBefore: today, limit: 100 }),
  ]);

  const withKm = (e: Evento) => (e.lat != null && e.lon != null ? distanceKm(origin, { lat: e.lat, lon: e.lon }) : undefined);
  let events = sortByNext([...upcoming, ...ongoing]);
  if (active.has("cerca")) events = [...events].sort((a, b) => (withKm(a) ?? 99) - (withKm(b) ?? 99));
  const shown = events.slice(0, limit);

  const usedSources = [...new Set(shown.map((e) => e.fuente))].map((id) => fuentes[id]).filter(Boolean);

  // Enlace que activa/desactiva un filtro manteniendo los demás y la búsqueda
  const toggleHref = (f: Filter) => {
    const next = new Set(active);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    const qs = new URLSearchParams();
    qs.set("f", [...next].join(","));
    if (search) qs.set("q", search);
    return `/?${qs}`;
  };
  const moreHref = () => {
    const qs = new URLSearchParams({ f: [...active].join(","), n: String(limit + PAGE) });
    if (search) qs.set("q", search);
    return `/?${qs}`;
  };

  const chips: { id: Filter; label: string; hidden?: boolean }[] = [
    { id: "para-ti", label: "Para ti", hidden: !perfil },
    { id: "cerca", label: "Cerca de mí" },
    { id: "gratis", label: "Gratis" },
    { id: "accesible", label: "Accesible" },
  ];

  return (
    <main className="flex flex-col">
      <Welcome mode={params.bienvenida} nombre={perfil?.nombre} />

      <HomeHeader db={supabase} perfil={perfil} originKind={origin.kind} search={search} searchAction="/" hidden={{ f: [...active].join(",") }} />

      <div className="flex flex-col gap-5 bg-fondo px-5 pb-8 pt-5">
        <ViewToggle current="lista" search={search} />

        <nav aria-label="Filtros" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {chips.filter((c) => !c.hidden).map((c) => {
            const on = active.has(c.id);
            return (
              <Link
                key={c.id}
                href={toggleHref(c.id)}
                aria-pressed={on}
                scroll={false}
                className={`flex h-12 shrink-0 items-center gap-1.5 rounded-full px-5 text-lg font-medium ${
                  on ? "bg-degradado text-white shadow-md shadow-coral/25" : "border border-slate-200 bg-white"
                }`}
              >
                {c.id === "accesible" && <Accessibility size={18} aria-hidden="true" />}
                {c.label}
              </Link>
            );
          })}
        </nav>

        {active.has("para-ti") && intereses.length === 0 && (
          <p className="rounded-2xl bg-crema p-4 text-base">
            Aún no has elegido tus intereses. <Link href="/perfil" className="font-semibold text-coral-texto underline">Elígelos en tu perfil</Link> y te recomendaremos planes.
          </p>
        )}

        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold">{search ? `«${search}»` : "Próximas quedadas"}</h1>
          <Link href="/mapa" className="text-lg font-semibold text-coral-texto">Ver mapa</Link>
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center">
            <p className="text-xl font-semibold">No hay planes con estos filtros</p>
            <p className="text-base text-gris">Prueba a quitar algún filtro{active.has("cerca") ? " o a buscar más lejos" : ""}.</p>
            <Link href="/?f=" className="mt-2 rounded-2xl border border-slate-300 px-5 py-3 font-medium">Ver todos los planes</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {shown.map((e) => (
              <EventCard key={e.id} evento={e} fuente={fuentes[e.fuente]} distanceKm={origin.kind !== "centro" ? withKm(e) : undefined} />
            ))}
          </div>
        )}

        {events.length > shown.length && (
          <Link href={moreHref()} scroll={false} className="flex h-14 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg font-medium">
            Ver más planes
          </Link>
        )}

        {usedSources.length > 0 && (
          <section aria-labelledby="fuentes" className="flex flex-col gap-2 rounded-2xl bg-white p-4">
            <h2 id="fuentes" className="flex items-center gap-2 text-base font-semibold">
              <Database size={18} aria-hidden="true" /> Datos abiertos de esta lista
            </h2>
            <ul className="flex flex-col gap-1 text-sm text-gris">
              {usedSources.map((f) => (
                <li key={f.id}>
                  <a href={f.url_ficha} target="_blank" rel="noopener noreferrer" className="underline">{f.nombre}</a> · {f.organismo}
                  {f.ultima_carga && ` · actualizado el ${new Date(f.ultima_carga).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}`}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
