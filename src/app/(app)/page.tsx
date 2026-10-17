import Link from "next/link";
import { Accessibility, CalendarDays, ChevronDown, Database, Languages, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { distanceKm, getEvents, getSources, hasEnded, sortByRelevance, type EventFilters, type Evento } from "@/lib/data";
import { formatDayLong, isPickableDay } from "@/lib/format";
import DayPicker from "@/components/DayPicker";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { categoriesForInterests, INTERESTS } from "@/lib/interests";
import { listPhotos } from "@/lib/categoryPhotos";
import {
  isLanguagePlan, isNewcomerPlan, LANGUAGE_CATEGORIES, NEWCOMER_CATEGORIES, NEWCOMER_GROUPS, newcomerGroup, parseNewcomerGroup,
} from "@/lib/newcomers";
import EventCard from "@/components/EventCard";
import Welcome from "@/components/Welcome";
import HomeHeader from "@/components/HomeHeader";
import SearchBox from "@/components/SearchBox";
import ViewToggle from "@/components/ViewToggle";

export const metadata = { title: "Inicio · MiMad" };

type Filter = "para-ti" | "cerca" | "gratis" | "accesible" | "idiomas" | "recien";
// Filtros que eligen el tipo de plan: solo uno a la vez (y quitan los intereses elegidos)
const TOPIC_FILTERS: Filter[] = ["para-ti", "idiomas", "recien"];
const PAGE = 20;

// i = intereses elegidos a mano ("musica,baile"); t = 1 si la fila de intereses está abierta;
// d = cuándo: "hoy", "manana", "semana" o un día elegido en el calendario ("2026-11-07");
// g = grupo de "Recién llegados" ("espanol", "tramites", "empleo", "convivencia")
type Search = { bienvenida?: string; q?: string; f?: string; n?: string; i?: string; t?: string; d?: string; g?: string };
type Day = "hoy" | "manana" | "semana";
const DAY_CHIPS: { id: Day; label: string; title: string }[] = [
  { id: "hoy", label: "Hoy", title: "Planes de hoy" },
  { id: "manana", label: "Mañana", title: "Planes de mañana" },
  { id: "semana", label: "Esta semana", title: "Planes de esta semana" },
];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Inicio de la versión por defecto (diseño inicio.png). Los filtros van en la dirección
// (?f=gratis,cerca&q=taller) para que se puedan compartir y volver atrás sin perderlos.
export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [perfil, fuentes] = await Promise.all([getCurrentProfile(supabase), getSources()]);
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
  // Personas extranjeras: actividades de los CEPI (por grupos) o de idiomas
  const newcomers = active.has("recien");
  const languages = !newcomers && active.has("idiomas");
  const group = newcomers ? parseNewcomerGroup(params.g) : null;
  const keep = (e: Evento) =>
    newcomers ? isNewcomerPlan(e) && (!group || newcomerGroup(e) === group) : languages ? isLanguagePlan(e) : true;

  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const base: EventFilters = {
    search: search || undefined,
    free: active.has("gratis"),
    accessible: active.has("accesible"),
    // "Recién llegados" e "Idiomas" mandan; luego los intereses elegidos a mano; si no, "Para ti"
    categories: newcomers
      ? NEWCOMER_CATEGORIES
      : languages
        ? LANGUAGE_CATEGORIES
        : picked.length
      ? categoriesForInterests(picked)
      : active.has("para-ti") && intereses.length
        ? categoriesForInterests(intereses)
        : undefined,
  };
  // Cuándo: un día del calendario, hoy, mañana o esta semana (sin elegir: las dos próximas semanas)
  const pickedDay = isPickableDay(params.d, today) ? params.d : null;
  const day: Day | null = pickedDay ? null : DAY_CHIPS.find((c) => c.id === params.d)?.id ?? null;
  const range = pickedDay
    ? { from: pickedDay, to: pickedDay }
    : day === "hoy" ? { from: today, to: today }
    : day === "manana" ? { from: addDays(today, 1), to: addDays(today, 1) }
    : day === "semana" ? { from: today, to: addDays(today, 6) }
    : null;
  const dayParam = pickedDay ?? day; // lo que va en ?d=
  // Días de la semana de ese rango (para los talleres semanales, que no tienen fecha)
  const weekdays = range ? new Set(Array.from({ length: day === "semana" ? 7 : 1 }, (_, i) => WEEKDAYS[new Date(`${addDays(range.from, i)}T12:00:00Z`).getUTCDay()])) : null;

  // Dos consultas: lo que empieza en las dos próximas semanas y lo que ya está en marcha o es semanal
  const in14 = new Date(Date.now() + 14 * 86_400_000).toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const fetchWithin = async (km: number | null) => {
    const near = km ? { lat: origin.lat, lon: origin.lon, km } : undefined;
    if (range && weekdays) {
      // Con días elegidos: lo que ocurre esos días y los talleres semanales de esos días
      const [dated, weekly] = await Promise.all([
        getEvents(supabase, { ...base, near, between: range, limit: 1000 }),
        getEvents(supabase, { ...base, near, undatedOnly: true, limit: 200 }),
      ]);
      return [...dated.filter((e) => !hasEnded(e)), ...weekly.filter((e) => [...weekdays].some((w) => plain(e.horario ?? "").includes(plain(w))))].filter(keep);
    }
    const [up, on] = await Promise.all([
      getEvents(supabase, { ...base, near, startsFrom: today, between: { from: today, to: in14 }, limit: 1000 }),
      getEvents(supabase, { ...base, near, startedBefore: today, limit: 300 }),
    ]);
    return [...up, ...on].filter(keep);
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
  // Con días elegidos: primero lo que empieza esos días, luego los talleres semanales y al
  // final lo que dura semanas (exposiciones…). Dentro de cada grupo, el orden de antes.
  if (range) {
    const group = (e: Evento) => (!e.fecha_inicio ? 1 : e.fecha_inicio.slice(0, 10) >= range.from ? 0 : 2);
    events = events.map((e, i) => ({ e, i })).sort((a, b) => group(a.e) - group(b.e) || a.i - b.i).map(({ e }) => e);
  }
  const shown = events.slice(0, limit);
  const photos = listPhotos(shown);

  const usedSources = [...new Set(shown.map((e) => e.fuente))].map((id) => fuentes[id]).filter(Boolean);

  // Enlaces que cambian un filtro y conservan los demás (y la búsqueda)
  const href = (changes: { f?: Set<Filter>; i?: string[]; t?: boolean; n?: number; d?: string | null; g?: string | null }) => {
    const qs = new URLSearchParams();
    qs.set("f", [...(changes.f ?? active)].join(","));
    const i = changes.i ?? picked;
    if (i.length) qs.set("i", i.join(","));
    if (changes.t ?? interestsOpen) qs.set("t", "1");
    if (changes.n) qs.set("n", String(changes.n));
    const d = changes.d === undefined ? dayParam : changes.d;
    if (d) qs.set("d", d);
    const g = changes.g === undefined ? group : changes.g;
    if (g && (changes.f ?? active).has("recien")) qs.set("g", g);
    if (search) qs.set("q", search);
    return `/?${qs}`;
  };
  const toggleHref = (f: Filter) => {
    const next = new Set(active);
    if (next.has(f)) next.delete(f);
    else {
      // "Para ti", "Idiomas" y "Recién llegados" no se mezclan entre sí ni con los intereses
      if (TOPIC_FILTERS.includes(f)) {
        TOPIC_FILTERS.forEach((x) => next.delete(x));
        next.add(f);
        return href({ f: next, i: [], t: false, g: null, n: 0 });
      }
      next.add(f);
    }
    return href({ f: next, n: 0 });
  };
  const withoutTopics = () => new Set([...active].filter((x) => x !== "idiomas" && x !== "recien"));
  const toggleInterest = (id: string) =>
    href({ f: withoutTopics(), i: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id], n: 0 });
  const moreHref = () => href({ n: limit + PAGE });

  // "Planes del viernes 7 de noviembre", "Planes de hoy"…
  const dayTitle = pickedDay ? `Planes del ${formatDayLong(pickedDay)}` : DAY_CHIPS.find((c) => c.id === day)?.title ?? null;
  const dayChip = (on: boolean) =>
    `flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-base font-medium ${on ? "bg-tinta text-white" : "border border-slate-200 bg-white"}`;

  const chips: { id: Filter; label: string; hidden?: boolean }[] = [
    { id: "para-ti", label: "Para ti", hidden: !perfil },
    { id: "cerca", label: "Cerca de mí" },
    { id: "gratis", label: "Gratis" },
    { id: "accesible", label: "Accesible" },
    { id: "idiomas", label: "Idiomas" },
  ];
  const chipIcon = { accesible: Accessibility, idiomas: Languages } as Partial<Record<Filter, typeof Languages>>;

  return (
    <main className="flex flex-col">
      <Welcome mode={params.bienvenida} nombre={perfil?.nombre} />

      <HomeHeader db={supabase} perfil={perfil} originKind={origin.kind} zone={origin.zone}
        newcomers={{ active: newcomers, href: toggleHref("recien") }} />

      <div className="flex flex-col gap-5 border-t border-slate-200 bg-fondo px-5 pb-8 pt-5">
        <SearchBox search={search} action="/"
          hidden={{ f: [...active].join(","), ...(picked.length ? { i: picked.join(",") } : {}), ...(dayParam ? { d: dayParam } : {}), ...(group ? { g: group } : {}) }} />
        <ViewToggle current="lista" search={search} />

        <nav aria-label="Filtros" className="sin-barra -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {/* Los activos primero: así se ven (y se pueden quitar) aunque la fila se desplace */}
          {chips.filter((c) => !c.hidden).sort((a, b) => Number(active.has(b.id)) - Number(active.has(a.id))).map((c) => {
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
                {(() => {
                  const Icon = chipIcon[c.id];
                  return Icon ? <Icon size={18} aria-hidden="true" /> : null;
                })()}
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

        {/* Cuándo: tocar el elegido otra vez lo quita (vuelven las próximas dos semanas) */}
        <nav aria-label="Cuándo" className="sin-barra -mx-5 -mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
          {DAY_CHIPS.map((c) => {
            const on = day === c.id;
            return (
              <Link key={c.id} href={href({ d: on ? null : c.id, n: 0 })} aria-pressed={on} scroll={false} className={dayChip(on)}>
                {c.label}
              </Link>
            );
          })}
          <DayPicker value={pickedDay} today={today} baseHref={href({ d: null, n: 0 })} param="d" todayHref={href({ d: "hoy", n: 0 })} className={dayChip(!!pickedDay)}>
            <CalendarDays size={18} aria-hidden="true" />
            {pickedDay ? formatDayLong(pickedDay).replace(/ de .*/, "") : "Elegir día"}
          </DayPicker>
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

        {newcomers && (
          <section aria-label="Recién llegados" className="-mt-2 flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-base leading-relaxed">
              Actividades gratuitas de los <strong>CEPI</strong>, los centros de participación e integración de la Comunidad de Madrid: clases de
              español, ayuda con trámites, empleo y actividades para conocer gente. Son de este mes: pregunta en el centro el día y la hora.
            </p>
            <nav aria-label="Tipo de actividad" className="flex flex-wrap gap-2">
              {NEWCOMER_GROUPS.map(({ id, label, icon: Icon }) => {
                const on = group === id;
                return (
                  <Link
                    key={id}
                    href={href({ g: on ? null : id, n: 0 })}
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
            </nav>
          </section>
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
          <h1 className="text-3xl font-bold">{search ? `«${search}»` : (dayTitle ?? (newcomers ? "Para recién llegados" : languages ? "Planes de idiomas" : "Próximas quedadas"))}</h1>
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
            {shown.map((e, i) => (
              <EventCard key={e.id} evento={e} photo={photos[i]} fuente={fuentes[e.fuente]} distanceKm={origin.kind !== "centro" ? withKm(e) : undefined} onDay={range?.from} />
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
