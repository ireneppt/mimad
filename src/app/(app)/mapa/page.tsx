import Link from "next/link";
import { CalendarDays, Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { distanceKm, getEvents, getPlaces, getSources, hasEnded, isAccessible, type Evento } from "@/lib/data";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { categoryInfo } from "@/lib/categories";
import { formatDistance, formatWhen, niceText } from "@/lib/format";
import HomeHeader from "@/components/HomeHeader";
import ViewToggle from "@/components/ViewToggle";
import MapExplorerLazy from "./MapExplorerLazy";
import DatePicker from "./DatePicker";
import type { MapPoint, MapSource } from "./types";

export const metadata = { title: "Mapa · MiMad" };

type Day = "hoy" | "manana" | "semana" | "fecha";
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Mapa de planes y lugares (diseño mapa.png). Los filtros van en la dirección:
// ?d=hoy|manana|semana|AAAA-MM-DD &lugares=1 &q=texto
export default async function MapPage({ searchParams }: { searchParams: Promise<{ d?: string; lugares?: string; q?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [perfil, fuentes] = await Promise.all([getCurrentProfile(supabase), getSources(supabase)]);
  const origin = await getOrigin(perfil);
  const search = (params.q ?? "").trim().slice(0, 60);
  const showPlaces = params.lugares === "1";

  // Qué días: hoy, mañana, los próximos 7 días o una fecha elegida
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const picked = /^\d{4}-\d{2}-\d{2}$/.test(params.d ?? "") && params.d! >= today ? params.d! : null;
  const day: Day = picked ? "fecha" : params.d === "hoy" || params.d === "manana" ? params.d : "semana";
  const range =
    day === "hoy" ? { from: today, to: today }
    : day === "manana" ? { from: addDays(today, 1), to: addDays(today, 1) }
    : day === "fecha" ? { from: picked!, to: picked! }
    : { from: today, to: addDays(today, 6) };
  // Días de la semana que caen en ese rango (para los talleres semanales sin fecha)
  const weekdays = new Set(
    Array.from({ length: day === "semana" ? 7 : 1 }, (_, i) => WEEKDAYS[new Date(`${addDays(range.from, i)}T12:00:00Z`).getUTCDay()])
  );

  const near = { lat: origin.lat, lon: origin.lon, km: 12 };
  const [dated, weekly, places] = await Promise.all([
    getEvents(supabase, { search: search || undefined, near, between: range, limit: 1500 }),
    getEvents(supabase, { search: search || undefined, near, undatedOnly: true, limit: 200 }),
    showPlaces ? getPlaces(supabase, undefined, { near, search: search || undefined }) : Promise.resolve([]),
  ]);
  const weeklyThatDay = weekly.filter((e) => [...weekdays].some((w) => plain(e.horario ?? "").includes(plain(w))));
  const events = [...dated.filter((e) => !hasEnded(e)), ...weeklyThatDay];

  const km = (p: { lat: number | null; lon: number | null }) =>
    origin.kind !== "centro" && p.lat != null && p.lon != null ? formatDistance(distanceKm(origin, { lat: p.lat, lon: p.lon })) : null;

  const points: MapPoint[] = [
    ...events
      .filter((e): e is Evento & { lat: number; lon: number } => e.lat != null && e.lon != null)
      .map((e) => {
        const w = formatWhen(e);
        return {
          id: e.id,
          kind: "evento" as const,
          title: e.titulo,
          category: e.categoria,
          label: categoryInfo(e.categoria).label,
          lat: e.lat,
          lon: e.lon,
          when: [w.day, w.time].filter(Boolean).join(" · "),
          free: !!e.gratuito,
          accessible: isAccessible(e),
          km: km(e),
          address: niceText(e.lugar) ?? niceText(e.direccion),
          source: e.fuente,
        };
      }),
    ...places.map((l) => ({
      id: l.id,
      kind: "lugar" as const,
      title: l.nombre,
      category: l.categoria,
      label: l.categoria,
      lat: l.lat,
      lon: l.lon,
      km: km(l),
      address: [niceText(l.direccion), l.municipio].filter(Boolean).join(", "),
      schedule: l.horario,
      phone: l.telefono,
      web: l.url,
      source: l.fuente,
    })),
  ];
  const sources: Record<string, MapSource> = Object.fromEntries(
    [...new Set(points.map((p) => p.source))].map((id) => [
      id,
      { label: fuentes[id] ? `${fuentes[id].nombre} · ${fuentes[id].organismo}` : id, url: fuentes[id]?.url_ficha ?? null },
    ])
  );

  // Enlace que cambia un filtro y conserva los demás
  const href = (changes: Record<string, string | null>) => {
    const qs = new URLSearchParams();
    const current: Record<string, string | null> = { d: picked ?? day, lugares: showPlaces ? "1" : null, q: search || null, ...changes };
    for (const [k, v] of Object.entries(current)) if (v) qs.set(k, v);
    return `/mapa?${qs}`;
  };
  const chip = (on: boolean) =>
    `flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-base font-medium shadow-sm ${on ? "bg-tinta text-white" : "bg-white text-tinta"}`;

  return (
    <main className="flex flex-col">
      <HomeHeader
        db={supabase}
        perfil={perfil}
        originKind={origin.kind}
        search={search}
        searchAction="/mapa"
        hidden={{ d: picked ?? day, ...(showPlaces ? { lugares: "1" } : {}) }}
      />

      <section aria-label="Mapa de planes" className="relative h-[72dvh] min-h-[440px]">
        <MapExplorerLazy
          points={points}
          sources={sources}
          origin={origin.kind !== "centro" ? { lat: origin.lat, lon: origin.lon } : null}
          center={{ lat: origin.lat, lon: origin.lon }}
        />

        {/* Controles encima del mapa */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-3 p-4">
          <div className="pointer-events-auto w-fit">
            <ViewToggle current="mapa" search={search} />
          </div>
          <nav aria-label="Cuándo" className="pointer-events-auto -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link href={href({ d: "hoy" })} aria-pressed={day === "hoy"} scroll={false} className={chip(day === "hoy")}>Hoy</Link>
            <Link href={href({ d: "manana" })} aria-pressed={day === "manana"} scroll={false} className={chip(day === "manana")}>Mañana</Link>
            <Link href={href({ d: "semana" })} aria-pressed={day === "semana"} scroll={false} className={chip(day === "semana")}>Esta semana</Link>
            <DatePicker value={picked} min={today} baseHref={href({ d: null })} className={chip(day === "fecha")} icon={<CalendarDays size={18} aria-hidden="true" />} />
            <Link href={href({ lugares: showPlaces ? null : "1" })} aria-pressed={showPlaces} scroll={false} className={chip(showPlaces)}>
              <Landmark size={18} aria-hidden="true" /> Lugares
            </Link>
          </nav>
        </div>
      </section>

      <p className="px-5 py-3 text-sm text-gris">
        {events.length} {events.length === 1 ? "plan" : "planes"}
        {showPlaces ? ` y ${places.length} lugares` : ""} a menos de 12 km. Mapa: © colaboradores de OpenStreetMap.
      </p>
    </main>
  );
}
