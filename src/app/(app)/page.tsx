import Link from "next/link";
import { Accessibility, ChevronDown, Database, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { distanceKm, getEvents, getSources, sortByRelevance, type EventFilters, type Evento } from "@/lib/data";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { categoriesForInterests, INTERESTS } from "@/lib/interests";
import EventCard from "@/components/EventCard";
import Welcome from "@/components/Welcome";
import HomeHeader from "@/components/HomeHeader";
import ViewToggle from "@/components/ViewToggle";

export const metadata = { title: "Inicio · MiMad" };

type Filter = "para-ti" | "cerca" | "gratis" | "accesible";
const PAGE = 20;

// i = intereses elegidos a mano ("musica,baile"); t = 1 si la fila de intereses está abierta
type Search = { bienvenida?: string; q?: string; f?: string; n?: string; i?: string; t?: string };

// Inicio de la versión por defecto (diseño inicio.png). Los filtros van en la dirección
// (?f=gratis,cerca&q=taller) para que se puedan compartir y volver atrás sin perderlos.
export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [perfil, fuentes] = await Promise.all([getCurrentProfile(supabase), getSources(supabase)]);
  const origin = await getOrigin(perfil, { allowZone: true });

  const search = (params.q ?? "").trim().slice(0, 60);
  const intereses = perfil?.intereses ?? [];
  // Sin elegir nada: "Para ti" si tiene intereses
  const active = new Set<Filter>(
    params.f !== undefined ? (params.f.split(",").filter(Boolean) as Filter[]) : intereses.length ? ["para-ti"] : []
  );
  const limit = Math.min(Number(params.n) || PAGE, 200);
  const validInterests = new Set(INTERESTS.map((x) => x.id));
  const picked = (params.i ?? "").split(",").filter((x) => validInterests.has(x));
  const interestsOpen = params.t === "1" || picked.length > 0;

  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const base: EventFilters = {
    search: search || undefined,
    free: active.has("gratis"),
    accessible: active.has("accesible"),
    // Intereses elegidos a mano en el filtro; si no, "Para ti" usa los del perfil
    categories: picked.length
      ? categoriesForInterests(picked)
      : active.has("para-ti") && intereses.length
        ? categoriesForInterests(intereses)
        : undefined,
  };
  // Dos consultas: lo que empieza en las dos próximas semanas y lo que ya está en marcha o es semanal
  const in14 = new Date(Date.now() + 14 * 86_400_000).toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const fetchWithin = async (km: number | null) => {
    const near = km ? { lat: origin.lat, lon: origin.lon, km } : undefined;
    const [up, on] = await Promise.all([
      getEvents(supabase, { ...base, near, startsFrom: today, between: { from: today, to: in14 }, limit: 1000 }),
      getEvents(supabase, { ...base, near, startedBefore: today, limit: 300 }),
    ]);
    return [...up, ...on];
  };
  // "Cerca de mí" = 2 km. Si no, 10 km alrededor; y si hay pocos planes (pueblos pequeños),
  // se amplía sola la búsqueda: 25 km, 50 km y, al final, toda la Comunidad.
  const MIN_PLANS = 8;
  let radius: number | null = active.has("cerca") ? 2 : 10;
  let found = await fetchWithin(radius);
  if (!active.has("cerca")) {
    for (const next of [25, 50, null]) {
      if (found.length >= MIN_PLANS) break;
      radius = next;
      found = await fetchWithin(radius);
    }
  }
  const widened = !active.has("cerca") && radius !== 10;

  const withKm = (e: Evento) => (e.lat != null && e.lon != null ? distanceKm(origin, { lat: e.lat, lon: e.lon }) : undefined);
  // Orden: lo que te interesa y está cerca, en los próximos días ("Cerca de mí": solo por distancia)
  let events = sortByRelevance(found, { origin, categories: categoriesForInterests(picked.length ? picked : intereses) });
  if (active.has("cerca")) events = [...events].sort((a, b) => (withKm(a) ?? 99) - (withKm(b) ?? 99));
  const shown = events.slice(0, limit);

  const usedSources = [...new Set(shown.map((e) => e.fuente))].map((id) => fuentes[id]).filter(Boolean);

  // Enlaces que cambian un filtro y conservan los demás (y la búsqueda)
  const href = (changes: { f?: Set<Filter>; i?: string[]; t?: boolean; n?: number }) => {
    const qs = new URLSearchParams();
    qs.set("f", [...(changes.f ?? active)].join(","));
    const i = changes.i ?? picked;
    if (i.length) qs.set("i", i.join(","));
    if (changes.t ?? interestsOpen) qs.set("t", "1");
    if (changes.n) qs.set("n", String(changes.n));
    if (search) qs.set("q", search);
    return `/?${qs}`;
  };
  const toggleHref = (f: Filter) => {
    const next = new Set(active);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    return href({ f: next });
  };
  const toggleInterest = (id: string) => href({ i: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id] });
  const moreHref = () => href({ n: limit + PAGE });

  const chips: { id: Filter; label: string; hidden?: boolean }[] = [
    { id: "para-ti", label: "Para ti", hidden: !perfil },
    { id: "cerca", label: "Cerca de mí" },
    { id: "gratis", label: "Gratis" },
    { id: "accesible", label: "Accesible" },
  ];

  return (
    <main className="flex flex-col">
      <Welcome mode={params.bienvenida} nombre={perfil?.nombre} />

      <HomeHeader db={supabase} perfil={perfil} originKind={origin.kind}
        zone={origin.zone} search={search} searchAction="/" hidden={{ f: [...active].join(","), ...(picked.length ? { i: picked.join(",") } : {}) }} />

      <div className="flex flex-col gap-5 bg-fondo px-5 pb-8 pt-5">
        <ViewToggle current="lista" search={search} />

        <nav aria-label="Filtros" className="sin-barra -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
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
          {/* Filtro por intereses: abre/cierra la fila con los 12 intereses */}
          <Link
            href={interestsOpen ? href({ t: false, i: [] }) : href({ t: true })}
            aria-expanded={interestsOpen}
            scroll={false}
            className={`flex h-12 shrink-0 items-center gap-1.5 rounded-full px-5 text-lg font-medium ${
              picked.length ? "bg-degradado text-white shadow-md shadow-coral/25" : "border border-slate-200 bg-white"
            }`}
          >
            <Sparkles size={18} aria-hidden="true" />
            Intereses{picked.length ? ` · ${picked.length}` : ""}
            <ChevronDown size={18} className={interestsOpen ? "rotate-180" : ""} aria-hidden="true" />
          </Link>
        </nav>

        {interestsOpen && (
          <nav aria-label="Filtrar por intereses" className="-mt-2 flex flex-wrap gap-2 rounded-3xl bg-white p-3 ring-1 ring-slate-200">
            {INTERESTS.map(({ id, label, icon: Icon }) => {
              const on = picked.includes(id);
              return (
                <Link
                  key={id}
                  href={toggleInterest(id)}
                  aria-pressed={on}
                  scroll={false}
                  className={`flex h-11 items-center gap-1.5 rounded-full px-4 text-base font-medium ${
                    on ? "bg-degradado text-white" : "bg-slate-50 text-tinta ring-1 ring-slate-200"
                  }`}
                >
                  <Icon size={17} className={on ? "" : "text-coral-texto"} aria-hidden="true" /> {label}
                </Link>
              );
            })}
            {picked.length > 0 && (
              <Link href={href({ i: [] })} scroll={false} className="flex h-11 items-center px-3 text-base font-medium text-coral-texto underline">
                Quitar
              </Link>
            )}
          </nav>
        )}

        {active.has("para-ti") && intereses.length === 0 && !picked.length && (
          <p className="rounded-2xl bg-crema p-4 text-base">
            Aún no has elegido tus intereses. <Link href="/perfil" className="font-semibold text-coral-texto underline">Elígelos en tu perfil</Link> y te recomendaremos planes.
          </p>
        )}

        {widened && shown.length > 0 && (
          <p role="status" className="rounded-2xl bg-crema p-4 text-base">
            Cerca de {origin.zone ?? "ti"} hay pocos planes: te enseñamos los más cercanos{radius ? `, hasta a ${radius} km` : " de toda la Comunidad de Madrid"}.
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
