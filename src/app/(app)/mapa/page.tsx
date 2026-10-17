import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { distanceKm, getEvents, getPlaces, getSources, hasEnded, isAccessible, type Evento } from "@/lib/data";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { categoryInfo } from "@/lib/categories";
import { formatDayLong, formatDistance, formatWhen, isPickableDay, niceText } from "@/lib/format";
import HomeHeader from "@/components/HomeHeader";
import ViewToggle from "@/components/ViewToggle";
import MapExplorerLazy from "./MapExplorerLazy";
import DayPicker from "@/components/DayPicker";
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

type Show = "planes" | "sitios" | "todo";

// Mapa de planes y sitios (diseño mapa.png). Los filtros van en la dirección:
// ?ver=planes|sitios|todo &d=hoy|manana|semana|AAAA-MM-DD &q=texto
// Planes = actividades con fecha (v_eventos). Sitios = hogares y centros de mayores, CEPI (v_lugares).
export default async function MapPage({ searchParams }: { searchParams: Promise<{ d?: string; ver?: string; lugares?: string; q?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [perfil, fuentes] = await Promise.all([getCurrentProfile(supabase), getSources()]);
  const origin = await getOrigin(perfil, { allowZone: true });
  const search = (params.q ?? "").trim().slice(0, 60);
  const show: Show =
    params.ver === "sitios" || params.ver === "todo" ? params.ver : params.ver === "planes" ? "planes" : params.lugares === "1" ? "todo" : "planes";
  const showEvents = show !== "sitios";
  const showPlaces = show !== "planes";

  // Qué días: hoy, mañana, los próximos 7 días o una fecha elegida
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const picked = isPickableDay(params.d, today) ? params.d : null;
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
    showEvents ? getEvents(supabase, { search: search || undefined, near, between: range, limit: 1500 }) : Promise.resolve([]),
    showEvents ? getEvents(supabase, { search: search || undefined, near, undatedOnly: true, limit: 200 }) : Promise.resolve([]),
    showPlaces ? getPlaces(supabase, undefined, { near, search: search || undefined }) : Promise.resolve([]),
  ]);
  const weeklyThatDay = weekly.filter((e) => [...weekdays].some((w) => plain(e.horario ?? "").includes(plain(w))));
  const events = [...dated.filter((e) => !hasEnded(e)), ...weeklyThatDay];

  const km = (p: { lat: number | null; lon: number | null }) =>
    origin.kind !== "centro" && p.lat != null && p.lon != null ? formatDistance(distanceKm(origin, { lat: p.lat, lon: p.lon })) : null;

  // Se mandan al móvil más de mil puntos: lo justo de cada uno (5 decimales ≈ 1 m; del
  // horario, solo la primera línea; el resto está en el detalle del plan)
  const coord = (n: number) => Math.round(n * 1e5) / 1e5;
  const firstLine = (s?: string | null) => {
    const line = s?.split("\n")[0].trim();
    return line && line.length > 70 ? `${line.slice(0, 68)}…` : line;
  };

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
          lat: coord(e.lat),
          lon: coord(e.lon),
          when: [w.day, firstLine(w.time)].filter(Boolean).join(" · "),
          free: !!e.gratuito,
          accessible: isAccessible(e),
          image: e.imagen ?? null,
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
      lat: coord(l.lat),
      lon: coord(l.lon),
      km: km(l),
      address: [niceText(l.direccion), l.municipio].filter(Boolean).join(", "),
      schedule: firstLine(l.horario) ?? null,
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
    const current: Record<string, string | null> = { ver: show === "planes" ? null : show, d: picked ?? day, q: search || null, ...changes };
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
        zone={origin.zone}
        search={search}
        searchAction="/mapa"
        hidden={{ d: picked ?? day, ...(show !== "planes" ? { ver: show } : {}) }}
      />

      <section aria-label="Mapa de planes y sitios" className="relative h-[72dvh] min-h-[440px]">
        <MapExplorerLazy
          points={points}
          sources={sources}
          origin={origin.kind !== "centro" ? { lat: origin.lat, lon: origin.lon } : null}
          center={{ lat: origin.lat, lon: origin.lon }}
          legend={show === "todo"}
        />

        {/* Controles encima del mapa */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-3 bg-gradient-to-b from-white/85 via-white/50 to-transparent p-4 pb-8">
          <div className="pointer-events-auto w-fit">
            <ViewToggle current="mapa" search={search} />
          </div>
          <nav aria-label="Qué ver y cuándo" className="sin-barra pointer-events-auto -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            {/* Qué ver: planes (círculos), sitios (cuadrados azules) o los dos */}
            <div role="group" aria-label="Qué ver" className="flex shrink-0 gap-1 rounded-full bg-white p-1 shadow-sm">
              {(["planes", "sitios", "todo"] as const).map((v) => (
                <Link
                  key={v}
                  href={href({ ver: v === "planes" ? null : v })}
                  aria-pressed={show === v}
                  scroll={false}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-base font-medium ${
                    show === v ? (v === "sitios" ? "bg-blue-700 text-white" : v === "planes" ? "bg-degradado text-white" : "bg-tinta text-white") : "text-tinta"
                  }`}
                >
                  {v === "planes" && <span className="h-3 w-3 rounded-full border-2 border-current" aria-hidden="true" />}
                  {v === "sitios" && <span className="h-3 w-3 rounded-[3px] bg-current" aria-hidden="true" />}
                  {v === "planes" ? "Planes" : v === "sitios" ? "Sitios" : "Todo"}
                </Link>
              ))}
            </div>
            {showEvents && (
              <>
            <Link href={href({ d: "hoy" })} aria-pressed={day === "hoy"} scroll={false} className={chip(day === "hoy")}>Hoy</Link>
            <Link href={href({ d: "manana" })} aria-pressed={day === "manana"} scroll={false} className={chip(day === "manana")}>Mañana</Link>
            <Link href={href({ d: "semana" })} aria-pressed={day === "semana"} scroll={false} className={chip(day === "semana")}>Esta semana</Link>
            <DayPicker value={picked} today={today} baseHref={href({ d: null })} param="d" todayHref={href({ d: "hoy" })} className={chip(day === "fecha")}>
              <CalendarDays size={18} aria-hidden="true" />
              {picked ? formatDayLong(picked).replace(/ de .*/, "") : "Elegir día"}
            </DayPicker>
              </>
            )}
          </nav>
        </div>
      </section>

      {/* Día elegido en el calendario: que se vea claro de qué día son los planes */}
      {picked && showEvents && (
        <h1 className="px-5 pt-4 text-2xl font-bold">Planes del {formatDayLong(picked)}</h1>
      )}
      <p className="px-5 py-3 text-sm text-gris">
        {[
          showEvents ? `${events.length} ${events.length === 1 ? "plan" : "planes"}` : null,
          showPlaces ? `${places.length} ${places.length === 1 ? "sitio" : "sitios"}` : null,
        ]
          .filter(Boolean)
          .join(" y ")}{" "}
        a menos de 12 km. Mapa: © colaboradores de OpenStreetMap.
      </p>
    </main>
  );
}
