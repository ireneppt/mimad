// Lectura de los datos abiertos unificados (v_eventos, v_lugares, da_fuentes).
// Se usa en el servidor: se le pasa el cliente de Supabase (salvo getSources, que va en memoria).
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "./supabase/public";

export type Evento = {
  id: string; // "<fuente>:<id original>"
  fuente: string;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  fecha_inicio: string | null; // hora local de Madrid, sin zona
  fecha_fin: string | null;
  horario: string | null;
  recurrente: boolean;
  lugar: string | null;
  direccion: string | null;
  municipio: string | null;
  distrito: string | null;
  lat: number | null;
  lon: number | null;
  url: string | null;
  gratuito: boolean | null;
  precio: string | null;
  accesibilidad: string | null;
  publico: string | null;
  idioma: string | null;
  organizacion?: string | null; // quién lo organiza (agenda del Ayuntamiento, CEPI, entidades de MiMad)
  imagen?: string | null; // foto (Agenda turística o la que sube la entidad); sin foto, se dibuja el icono
};

export type Lugar = {
  id: string;
  fuente: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  direccion: string | null;
  municipio: string | null;
  distrito: string | null;
  lat: number;
  lon: number;
  telefono: string | null;
  email: string | null;
  url: string | null;
  horario: string | null;
  accesibilidad: string | null;
  publico: string | null;
};

export type Fuente = {
  id: string;
  nombre: string;
  organismo: string;
  url_ficha: string;
  ultima_carga: string | null;
};

export type EventFilters = {
  search?: string;
  free?: boolean;
  accessible?: boolean;
  categories?: string[];
  sources?: string[];
  language?: string;
  near?: { lat: number; lon: number; km: number };
  startsFrom?: string; // "2026-10-16"
  startedBefore?: string;
  // Planes que ocurren algún día entre estas dos fechas (incluidas): empiezan antes del final
  // y terminan después del principio. Excluye los que no tienen fecha.
  between?: { from: string; to: string };
  undatedOnly?: boolean; // solo los que no tienen fecha (talleres semanales)
  columns?: string; // columnas a traer (por defecto LIST_COLUMNS: todas menos la descripción)
  limit?: number;
};

// Códigos de accesibilidad de la instalación (datos.madrid.es, "Estructura DS eventos"):
// https://datos.madrid.es/FWProjects/egob/Catalogo/XComun/Ficheros/Estructura_DS_eventos_wwwmadrid.pdf
export const ACCESSIBILITY_LABELS: Record<string, string> = {
  "0": "Instalación no accesible",
  "1": "Instalación accesible",
  "2": "Parcialmente accesible para movilidad reducida",
  "3": "Sin información de accesibilidad",
  "4": "Lengua de signos",
  "5": "Señalización podotáctil",
  "6": "Bucle magnético para audífonos",
};

const accessibilityCodes = (e: Pick<Evento, "accesibilidad">) =>
  (e.accesibilidad ?? "").split(",").map((c) => c.trim()).filter(Boolean);

// "Accesible" = la instalación es accesible (código 1)
export function isAccessible(e: Pick<Evento, "accesibilidad">): boolean {
  return accessibilityCodes(e).includes("1");
}

export function accessibilityLabels(e: Pick<Evento, "accesibilidad">): string[] {
  return accessibilityCodes(e).map((c) => ACCESSIBILITY_LABELS[c]).filter(Boolean);
}

// Columnas para las listas y el mapa: todas menos la descripción, que es lo que más pesa
// (más de la mitad de los datos) y solo se enseña en el detalle (getEvent)
export const LIST_COLUMNS =
  "id, fuente, titulo, categoria, fecha_inicio, fecha_fin, horario, recurrente, lugar, direccion, municipio, distrito, lat, lon, url, gratuito, precio, accesibilidad, publico, idioma, organizacion, imagen";

// Búsqueda de texto sin distinguir tildes ni mayúsculas: «menendez» encuentra «Menéndez» y
// «pena» encuentra «Peña». Se busca con una expresión regular (imatch de PostgREST) en la que
// cada vocal vale con o sin tilde; el resto del texto se escapa para que no cuente como regex.
const ACCENTS: Record<string, string> = { a: "aáàä", e: "eéèë", i: "iíìï", o: "oóòö", u: "uúùü", n: "nñ", c: "cç" };
export function accentPattern(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((ch) => (ACCENTS[ch] ? `[${ACCENTS[ch]}${ACCENTS[ch].toUpperCase()}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
}

export async function getEvents(db: SupabaseClient, f: EventFilters = {}): Promise<Evento[]> {
  let q = db.from("v_eventos").select(f.columns ?? LIST_COLUMNS);
  if (f.search) q = q.filter("titulo", "imatch", accentPattern(f.search));
  if (f.free) q = q.eq("gratuito", true);
  if (f.accessible) q = q.filter("accesibilidad", "match", "(^|,)1(,|$)"); // contiene el código 1
  if (f.categories?.length) q = q.in("categoria", f.categories);
  if (f.sources?.length) q = q.in("fuente", f.sources);
  if (f.language) q = q.eq("idioma", f.language);
  // Solo los que empiezan desde ese día / solo los ya empezados o sin fecha (talleres semanales)
  if (f.startsFrom) q = q.gte("fecha_inicio", f.startsFrom);
  if (f.startedBefore) q = q.or(`fecha_inicio.lt.${f.startedBefore},fecha_inicio.is.null`);
  if (f.between) q = q.lte("fecha_inicio", `${f.between.to}T23:59:59`).or(`fecha_fin.gte.${f.between.from},fecha_fin.is.null`);
  if (f.undatedOnly) q = q.is("fecha_inicio", null);
  if (f.near) {
    // Caja aproximada alrededor del punto (1º de latitud ≈ 111 km)
    const dLat = f.near.km / 111;
    const dLon = f.near.km / (111 * Math.cos((f.near.lat * Math.PI) / 180));
    q = q
      .gte("lat", f.near.lat - dLat).lte("lat", f.near.lat + dLat)
      .gte("lon", f.near.lon - dLon).lte("lon", f.near.lon + dLon);
  }
  // Primero los que empiezan antes; los recurrentes (sin fecha) al final
  q = q.order("fecha_inicio", { ascending: true, nullsFirst: false }).limit(f.limit ?? 50);

  const { data, error } = await q;
  if (error) throw new Error(`No se pudieron cargar los eventos: ${error.message}`);
  return ((data ?? []) as unknown as Evento[]).map((e) => ({ ...e, descripcion: e.descripcion ?? null }));
}

export async function getEvent(db: SupabaseClient, id: string): Promise<Evento | null> {
  const { data, error } = await db.from("v_eventos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el evento: ${error.message}`);
  return data as Evento | null;
}

export async function getEventsByIds(db: SupabaseClient, ids: string[]): Promise<Evento[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("v_eventos").select("*").in("id", ids);
  if (error) throw new Error(`No se pudieron cargar los eventos: ${error.message}`);
  return (data ?? []) as Evento[];
}

export async function getPlaces(
  db: SupabaseClient,
  categories?: string[],
  opts: { near?: { lat: number; lon: number; km: number }; search?: string } = {}
): Promise<Lugar[]> {
  // Sin la descripción (no se enseña en el mapa y es lo que más pesa)
  let q = db.from("v_lugares").select("id, fuente, nombre, categoria, direccion, municipio, distrito, lat, lon, telefono, email, url, horario, accesibilidad, publico");
  if (categories?.length) q = q.in("categoria", categories);
  if (opts.search) q = q.filter("nombre", "imatch", accentPattern(opts.search));
  if (opts.near) {
    const dLat = opts.near.km / 111;
    const dLon = opts.near.km / (111 * Math.cos((opts.near.lat * Math.PI) / 180));
    q = q
      .gte("lat", opts.near.lat - dLat).lte("lat", opts.near.lat + dLat)
      .gte("lon", opts.near.lon - dLon).lte("lon", opts.near.lon + dLon);
  }
  const { data, error } = await q.limit(1000);
  if (error) throw new Error(`No se pudieron cargar los lugares: ${error.message}`);
  return ((data ?? []) as Omit<Lugar, "descripcion">[]).map((l) => ({ ...l, descripcion: null }));
}

// Las fuentes de datos (nombre, enlace a la ficha, última carga) son iguales para todo el
// mundo y cambian como mucho una vez al día: se guardan en memoria una hora
const cachedSources = unstable_cache(
  async (): Promise<Record<string, Fuente>> => {
    const { data, error } = await createPublicClient().from("da_fuentes").select("id, nombre, organismo, url_ficha, ultima_carga");
    if (error) throw new Error(`No se pudieron cargar las fuentes: ${error.message}`);
    return Object.fromEntries((data ?? []).map((f) => [f.id as string, f as Fuente]));
  },
  ["da_fuentes"],
  { revalidate: 3600 }
);

export function getSources(): Promise<Record<string, Fuente>> {
  return cachedSources();
}

// Distancia en km entre dos puntos (fórmula del haversine)
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Orden por fecha: por la próxima vez que ocurre. Lo que ya ha empezado y dura
// semanas (exposiciones) cuenta como "hoy", pero detrás de los planes de un solo día.
// Los talleres semanales sin fecha van al final.
export function sortByNext(events: Evento[]): Evento[] {
  const today = nowInMadrid().slice(0, 10);
  const key = (e: Evento) => {
    if (!e.fecha_inicio) return `9|${e.titulo}`;
    const start = e.fecha_inicio.slice(0, 10);
    const ongoing = start < today;
    const day = ongoing ? today : start;
    const multiDay = !!e.fecha_fin && e.fecha_fin.slice(0, 10) !== start;
    const time = e.fecha_inicio.slice(11, 16);
    // 00:00 = sin hora concreta: detrás de los que sí la tienen
    return `1|${day}|${ongoing || multiDay ? 1 : 0}|${time === "00:00" ? "99:99" : time}`;
  };
  return [...events].filter((e) => !hasEnded(e)).sort((a, b) => key(a).localeCompare(key(b)));
}

// "2026-10-16T18:05" en hora de Madrid
function nowInMadrid(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).replace(" ", "T").slice(0, 16);
}

// La vista guarda los eventos hasta el final de su último día; aquí se quitan los de
// hoy que ya han terminado (o que empezaron hace más de 2 horas si no tienen hora de fin)
// Actividades de los CEPI: los datos solo dicen el mes, pero muchos títulos llevan los días
// («Conoce tus leyes - Martes 06», «Español A2.2 (Mód.1) 09», «6 y 8», «1,8,15,22,29 de octubre»).
// Devuelve el último de esos días (o null si el título no dice ninguno).
const MONTH_NAMES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre";
const WEEKDAY_NAMES = "lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo";
export function cepiLastDay(titulo: string): number | null {
  const t = titulo.toLowerCase().replace(/\s+/g, " ").trim();
  const lists = [
    new RegExp(`(\\d{1,2}(?:\\s*(?:,|y)\\s*\\d{1,2})*)\\s+de\\s+(?:${MONTH_NAMES})`).exec(t)?.[1], // «1,8,15 de octubre»
    new RegExp(`(?:${WEEKDAY_NAMES})\\s+(\\d{1,2})\\b`).exec(t)?.[1], // «martes 06»
    /\)\s*(\d{1,2}(?:\s*(?:,|y)\s*\d{1,2})*)\s*\.?$/.exec(t)?.[1], // «(mód 2) 14», «(mód 1) 6 y 8»
  ];
  const days = lists.flatMap((l) => (l ? l.split(/\s*(?:,|y)\s*/).map(Number) : [])).filter((d) => d >= 1 && d <= 31);
  return days.length ? Math.max(...days) : null;
}

export function hasEnded(e: Evento): boolean {
  if (!e.fecha_inicio) return false;
  const now = nowInMadrid();
  // CEPI: si el título dice los días y ya han pasado todos (en el mes de la actividad), ha terminado
  if (e.fuente === "cepi_actividades") {
    const last = cepiLastDay(e.titulo);
    if (last == null) return false;
    const day = `${e.fecha_inicio.slice(0, 8)}${String(last).padStart(2, "0")}`;
    return day < now.slice(0, 10);
  }
  const start = e.fecha_inicio.replace(" ", "T").slice(0, 16);
  const end = (e.fecha_fin ?? e.fecha_inicio).replace(" ", "T").slice(0, 16);
  if (end.slice(0, 10) !== now.slice(0, 10)) return end < now; // otro día
  const noRealEnd = end.endsWith("23:59") || end === start;
  if (!noRealEnd) return end < now;
  if (start.endsWith("00:00") || start.slice(0, 10) !== now.slice(0, 10)) return false; // sin hora o empezó otro día
  const [h, m] = start.slice(11).split(":").map(Number);
  const startPlus2h = `${start.slice(0, 10)}T${String(Math.min(h + 2, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return startPlus2h < now;
}

// Orden del Inicio: lo que te interesa y está cerca, en los próximos días.
// Puntuación (menos = mejor): kilómetros + días que faltan, con ventaja si encaja con tus
// intereses y una pequeña desventaja para lo que dura semanas (exposiciones).
export function sortByRelevance(
  events: Evento[],
  opts: { origin: { lat: number; lon: number }; categories?: string[] }
): Evento[] {
  const today = nowInMadrid().slice(0, 10);
  const liked = new Set(opts.categories ?? []);
  const dayDiff = (d: string) => Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  const score = (e: Evento) => {
    // Sin ubicación en los datos: al final (no sabemos si está cerca)
    const km = e.lat != null && e.lon != null ? distanceKm(opts.origin, { lat: e.lat, lon: e.lon }) : 100;
    let days = 3; // talleres semanales sin fecha: como si fueran en unos días
    let long = false;
    if (e.fecha_inicio) {
      const start = e.fecha_inicio.slice(0, 10);
      days = Math.max(0, dayDiff(start));
      long = start < today || (!!e.fecha_fin && e.fecha_fin.slice(0, 10) !== start);
    }
    return (
      Math.min(km, 100) * 1.0 + // cada km cuenta (también lejos: pueblos pequeños)
      Math.min(days, 30) * 0.6 + // cada día que falta cuenta algo menos
      (liked.size && e.categoria && liked.has(e.categoria) ? -4 : 0) + // encaja con tus intereses
      (long ? 1.5 : 0) // dura semanas: no hay prisa
    );
  };
  return [...events].filter((e) => !hasEnded(e)).map((e) => ({ e, s: score(e) })).sort((a, b) => a.s - b.s).map((x) => x.e);
}
