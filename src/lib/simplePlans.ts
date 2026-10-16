// Planes para la versión simplificada: cerca de casa y pensados para mayores.
// Se consulta v_eventos (datos abiertos) y se ordena: recomendados por la familia,
// público "Mayores", talleres "Juntos contra la soledad", gratis y accesibles primero.
import type { SupabaseClient } from "@supabase/supabase-js";
import { distanceKm, getEventsByIds, isAccessible, type Evento } from "./data";
import { formatDay, formatWhenLong } from "./format";

export type When = "hoy" | "manana" | "semana";

export const WHEN_LABELS: Record<When, string> = { hoy: "Hoy", manana: "Mañana", semana: "Semana" };

export function parseWhen(s: string | undefined): When {
  return s === "manana" || s === "semana" ? s : "hoy";
}

export type Plan = {
  evento: Evento;
  km: number | null;
  recomendadoPor: string | null; // nombre del familiar que lo recomienda
};

export type Recomendacion = { id: string; evento_id: string; de_nombre: string };

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Fecha de hoy en Madrid como "2026-10-16"
function todayIso(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Días que cubre cada pestaña: [primer día, último día]
function windowFor(when: When): [string, string] {
  const today = todayIso();
  if (when === "hoy") return [today, today];
  if (when === "manana") return [addDays(today, 1), addDays(today, 1)];
  return [today, addDays(today, 6)];
}

function weekdayOf(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}

// "MIÉRCOLES" → "miercoles" (los datos a veces vienen sin tildes o en mayúsculas)
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Público para el que el plan no tiene sentido (niños, jóvenes...)
const NOT_FOR_SENIORS = /niñ|infantil|joven|jóven|bebé|adolescen/i;

// Puntuación: más alta = sale antes
function score(e: Evento, km: number | null): number {
  let s = 0;
  if (/mayores/i.test(e.publico ?? "")) s += 5;
  if (e.fuente === "juntos_contra_soledad") s += 5;
  if (e.gratuito) s += 2;
  if (isAccessible(e)) s += 2;
  // Exposiciones y similares que duran semanas: menos interesantes que una quedada
  if (e.fecha_inicio && e.fecha_fin && e.fecha_fin.slice(0, 10) > e.fecha_inicio.slice(0, 10)) s -= 2;
  if (km != null) s -= km; // 1 punto menos por kilómetro
  return s;
}

export async function getSimplePlans(
  db: SupabaseClient,
  opts: { home: { lat: number; lon: number }; when: When; recomendaciones: Recomendacion[] }
): Promise<Plan[]> {
  const { home, when, recomendaciones } = opts;
  const [from, to] = windowFor(when);
  const start = `${from}T00:00:00`;
  const end = `${to}T23:59:59`;

  // Caja de unos 4 km alrededor de casa (1º de latitud ≈ 111 km)
  const km = 4;
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((home.lat * Math.PI) / 180));

  const { data, error } = await db
    .from("v_eventos")
    .select("*")
    .neq("fuente", "cepi_actividades") // actividades para personas migrantes: otro perfil
    .gte("lat", home.lat - dLat).lte("lat", home.lat + dLat)
    .gte("lon", home.lon - dLon).lte("lon", home.lon + dLon)
    // Recurrentes (sin fecha), o que empiezan en la ventana, o que ya han empezado y siguen
    .or(`fecha_inicio.is.null,and(fecha_inicio.gte.${start},fecha_inicio.lte.${end}),and(fecha_inicio.lte.${end},fecha_fin.gte.${start})`)
    .limit(400);
  if (error) throw new Error(`No se pudieron cargar los planes: ${error.message}`);

  const days = when === "semana" ? null : weekdayOf(from);
  const nearby = ((data ?? []) as Evento[]).filter((e) => {
    if (NOT_FOR_SENIORS.test(e.publico ?? "")) return false;
    // Talleres semanales: en "Hoy" y "Mañana", solo los de ese día de la semana
    if (!e.fecha_inicio && days) return plain(e.horario ?? "").includes(plain(days));
    return true;
  });

  // Los recomendados por la familia van siempre primero, aunque sean de otro día
  const recIds = [...new Set(recomendaciones.map((r) => r.evento_id))];
  const recEvents = await getEventsByIds(db, recIds);
  const recBy = new Map(recomendaciones.map((r) => [r.evento_id, r.de_nombre]));

  const toPlan = (e: Evento): Plan => ({
    evento: e,
    km: e.lat != null && e.lon != null ? distanceKm(home, { lat: e.lat, lon: e.lon }) : null,
    recomendadoPor: recBy.get(e.id) ?? null,
  });

  const recommended = recIds
    .map((id) => recEvents.find((e) => e.id === id))
    .filter((e): e is Evento => !!e)
    .map(toPlan);
  const rest = nearby
    .filter((e) => !recBy.has(e.id))
    .map(toPlan)
    .sort((a, b) => score(b.evento, b.km) - score(a.evento, a.km));

  return [...recommended, ...rest];
}

// Recomendaciones pendientes que me han hecho mis familiares (la más reciente primero)
export async function getPendingRecommendations(db: SupabaseClient, userId: string): Promise<Recomendacion[]> {
  const { data, error } = await db
    .from("mm_recomendaciones")
    .select("id, evento_id, de")
    .eq("para", userId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data?.length) return [];

  // Nombre de quien recomienda (las reglas de seguridad dejan ver el perfil de un vínculo aceptado)
  const { data: perfiles } = await db.from("mm_perfiles").select("id, nombre").in("id", [...new Set(data.map((r) => r.de))]);
  const names = new Map((perfiles ?? []).map((p) => [p.id as string, p.nombre as string]));
  return data.map((r) => ({ id: r.id, evento_id: r.evento_id, de_nombre: names.get(r.de) || "Tu familiar" }));
}

// Ids de los planes a los que ya me he apuntado
export async function getMyInscriptionIds(db: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await db.from("mm_inscripciones").select("evento_id").eq("usuario", userId);
  return (data ?? []).map((r) => r.evento_id as string);
}

// Cuándo es, en palabras: "Mañana, jueves 23 de octubre, a las 5 de la tarde"
export function whenInWords(e: Evento): string {
  if (!e.fecha_inicio) return e.horario ?? "Consultar el horario";
  const today = todayIso();
  const startDay = e.fecha_inicio.slice(0, 10);
  const endDay = e.fecha_fin?.slice(0, 10);
  // Dura varios días y ya ha empezado: "Hasta el 30 de noviembre"
  if (endDay && endDay > startDay && startDay <= today) {
    const [, m, d] = endDay.split("-").map(Number);
    const until = `Todos los días hasta el ${d} de ${MONTHS[m - 1]}`;
    return e.horario ? `${until}, ${e.horario}` : until;
  }
  const long = formatWhenLong(e);
  const rel = formatDay(e.fecha_inicio);
  return rel === "Hoy" || rel === "Mañana" ? `${rel}, ${long[0].toLowerCase()}${long.slice(1)}` : long;
}
