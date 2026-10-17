// Planes para la versión simplificada: cerca de casa y pensados para mayores.
// Se consulta v_eventos (datos abiertos) y se ordena: recomendados por la familia,
// lo que encaja con sus gustos (intereses del perfil), público "Mayores",
// talleres "Juntos contra la soledad", gratis y accesibles primero.
import type { SupabaseClient } from "@supabase/supabase-js";
import { distanceKm, getEventsByIds, isAccessible, type Evento } from "./data";
import { formatDay, formatWhenLong } from "./format";
import { INTERESTS } from "./interests";

export type When = "hoy" | "manana" | "semana";
// Ventanas de días: las pestañas de Planes, "el fin de semana" (Pedir consejo) y un día
// concreto elegido en el calendario ({ day: "2026-11-07" })
export type NamedWindow = When | "finde";
export type PlanWindow = NamedWindow | { day: string };

// Día elegido en el calendario → ventana. Hoy y mañana se tratan como sus pestañas
// (así "hoy" sigue quitando los talleres que ya han empezado)
export function windowForDay(day: string): PlanWindow {
  const today = todayIso();
  if (day === today) return "hoy";
  if (day === addDays(today, 1)) return "manana";
  return { day };
}

export const WHEN_LABELS: Record<When, string> = { hoy: "Hoy", manana: "Mañana", semana: "Semana" };

export function parseWhen(s: string | undefined): When {
  return s === "manana" || s === "semana" ? s : "hoy";
}

export type Plan = {
  evento: Evento;
  km: number | null;
  recomendadoPor: string | null; // nombre del familiar que lo recomienda
  mensaje: string | null; // lo que escribió el familiar al recomendarlo
  gusto: string | null; // interés del perfil con el que encaja ("Música")
};

export type Recomendacion = { id: string; evento_id: string; de_nombre: string; mensaje: string | null };

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Ahora en Madrid como "2026-10-16T13:05"
function nowIso(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).replace(" ", "T").slice(0, 16);
}

// Fecha de hoy en Madrid como "2026-10-16"
function todayIso(): string {
  return nowIso().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Días que cubre cada pestaña: [primer día, último día]
export function windowFor(when: PlanWindow): [string, string] {
  const today = todayIso();
  if (typeof when === "object") return [when.day, when.day];
  if (when === "hoy") return [today, today];
  if (when === "manana") return [addDays(today, 1), addDays(today, 1)];
  if (when === "finde") {
    // Este sábado y domingo (si hoy es domingo, solo hoy)
    const wd = new Date(`${today}T12:00:00Z`).getUTCDay();
    if (wd === 0) return [today, today];
    const sat = addDays(today, wd === 6 ? 0 : 6 - wd);
    return [sat, addDays(sat, 1)];
  }
  return [today, addDays(today, 6)];
}

function weekdayOf(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}

// "MIÉRCOLES" → "miercoles" (los datos a veces vienen sin tildes o en mayúsculas)
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Público para el que el plan no tiene sentido (niños, jóvenes...), salvo que incluya también a mayores
const NOT_FOR_SENIORS = /niñ|infantil|joven|jóven|bebé|adolescen/i;

// Interés del perfil con el que encaja la categoría del plan (el primero que coincida)
function matchingInterest(e: Evento, intereses: string[]): string | null {
  if (!e.categoria) return null;
  return INTERESTS.find((i) => intereses.includes(i.id) && i.categories.includes(e.categoria!))?.label ?? null;
}

// Puntuación: más alta = sale antes
function score(e: Evento, km: number | null, gusto: string | null, todos = false): number {
  let s = 0;
  if (gusto) s += 6; // encaja con lo que eligió al crear la cuenta
  if (!todos && /mayores/i.test(e.publico ?? "")) s += 5;
  if (e.fuente === "juntos_contra_soledad") s += 5;
  if (e.gratuito) s += 2;
  if (isAccessible(e)) s += 2;
  // Exposiciones o programaciones que duran semanas: menos interesantes que una quedada
  if (e.fecha_inicio && e.fecha_fin) {
    const days = (Date.parse(e.fecha_fin.slice(0, 10)) - Date.parse(e.fecha_inicio.slice(0, 10))) / 86_400_000;
    if (days > 7) s -= 8;
    else if (days > 1) s -= 2;
  }
  if (km != null) s -= km; // 1 punto menos por kilómetro
  return s;
}

// ¿Se puede ofrecer este plan en la ventana elegida? (público, filtro y que no haya pasado ya).
// La consulta ya trae solo lo que cae en esas fechas; esto afina lo que la consulta no puede.
function availableIn(when: PlanWindow, opts: { todos?: boolean; filter?: (e: Evento) => boolean }) {
  const [from, to] = windowFor(when);
  // Días de la semana que cubre la ventana (para los talleres semanales); null = toda la semana
  const days = when === "semana" ? null : [...new Set([from, to])].map(weekdayOf);
  const now = nowIso();
  return (e: Evento): boolean => {
    const publico = e.publico ?? "";
    if (!opts.todos && NOT_FOR_SENIORS.test(publico) && !/mayores/i.test(publico)) return false;
    if (opts.filter && !opts.filter(e)) return false;
    if (!e.fecha_inicio) {
      // Talleres semanales: en "Hoy", "Mañana" o el fin de semana, solo los de esos días
      if (days && !days.some((d) => plain(e.horario ?? "").includes(plain(d)))) return false;
      // Hoy: si ya ha empezado ("Cada viernes, 12:00 - 13:30" a las 13:05), no se ofrece
      const start = (e.horario ?? "").match(/(\d{1,2}):(\d{2})/);
      if (when === "hoy" && start && `${from}T${start[1].padStart(2, "0")}:${start[2]}` < now) return false;
      return true;
    }
    // Plan de un solo día que ya ha empezado
    const oneDay = !e.fecha_fin || e.fecha_fin.slice(0, 10) === e.fecha_inicio.slice(0, 10);
    if (oneDay && e.fecha_inicio.slice(11, 16) !== "00:00" && e.fecha_inicio.slice(0, 16) < now) return false;
    return true;
  };
}

// ¿El plan ocurre en esa ventana? (fechas que se cruzan, o taller semanal de esos días).
// Lo usa "Elegir día" para no enseñar recomendaciones de otros días.
export function happensIn(e: Evento, when: PlanWindow): boolean {
  const [from, to] = windowFor(when);
  if (e.fecha_inicio) {
    const start = e.fecha_inicio.slice(0, 10);
    const end = (e.fecha_fin ?? e.fecha_inicio).slice(0, 10);
    if (start > to || end < from) return false;
  }
  return availableIn(when, { todos: true })(e);
}

// Máximo de planes que se enseñan: pocos y buenos, para no abrumar
export const MAX_PLANS = 10;
// "Cerca de casa": hasta unos 4 km (lo que se busca para los planes cercanos)
export const NEARBY_KM = 4;

export async function getSimplePlans(
  db: SupabaseClient,
  opts: {
    home: { lat: number; lon: number };
    when: PlanWindow;
    recomendaciones: Recomendacion[];
    intereses: string[];
    filter?: (e: Evento) => boolean; // solo un tipo de planes (p. ej. "pasear" en Pedir consejo)
    max?: number; // cuántos devolver (el asistente le pasa más candidatos a Claude)
    todos?: boolean; // versión por defecto: planes para cualquier edad, también los de los CEPI
  }
): Promise<Plan[]> {
  const { home, when, recomendaciones, intereses, filter, max = MAX_PLANS, todos = false } = opts;
  const [from, to] = windowFor(when);
  const start = `${from}T00:00:00`;
  const end = `${to}T23:59:59`;

  // Caja de unos 4 km alrededor de casa (1º de latitud ≈ 111 km)
  const km = NEARBY_KM;
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((home.lat * Math.PI) / 180));

  let query = db.from("v_eventos").select("*");
  if (!todos) query = query.neq("fuente", "cepi_actividades"); // actividades para personas migrantes: otro perfil
  const { data, error } = await query
    .gte("lat", home.lat - dLat).lte("lat", home.lat + dLat)
    .gte("lon", home.lon - dLon).lte("lon", home.lon + dLon)
    // Recurrentes (sin fecha), o que empiezan en la ventana, o que ya han empezado y siguen
    .or(`fecha_inicio.is.null,and(fecha_inicio.gte.${start},fecha_inicio.lte.${end}),and(fecha_inicio.lte.${end},fecha_fin.gte.${start})`)
    .order("id")
    .limit(400);
  if (error) throw new Error(`No se pudieron cargar los planes: ${error.message}`);

  const available = availableIn(when, { todos, filter });
  const nearby = ((data ?? []) as Evento[]).filter(available);

  // Los recomendados por la familia van siempre primero, aunque sean de otro día
  const recIds = [...new Set(recomendaciones.map((r) => r.evento_id))];
  const recEvents = await getEventsByIds(db, recIds);
  const recBy = new Set(recomendaciones.map((r) => r.evento_id));

  const toPlan = (e: Evento) => buildPlan(e, { home, intereses, recomendaciones });

  const recommended = recIds
    .map((id) => recEvents.find((e) => e.id === id))
    .filter((e): e is Evento => !!e)
    .map(toPlan);
  const rest = nearby
    .filter((e) => !recBy.has(e.id))
    .map(toPlan)
    .sort((a, b) => score(b.evento, b.km, b.gusto, todos) - score(a.evento, a.km, a.gusto, todos) || a.evento.id.localeCompare(b.evento.id));

  return [...recommended, ...mixKinds(rest, max <= MAX_PLANS ? MAX_PER_KIND : 6)].slice(0, Math.max(max, recommended.length));
}

// Primera hora "HH:MM" de un texto ("Cada jueves, 16:00 - 17:30" → "16:00"); "00:00" = sin hora
function firstTime(s: string | null | undefined): string | null {
  const m = (s ?? "").match(/(\d{1,2}):(\d{2})/);
  const t = m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
  return t === "00:00" ? null : t;
}

// Cuándo empieza un plan dentro de la ventana, para ordenar por hora: "2026-10-17T18:00".
// Sin hora conocida, al final de su día ("…T99:99").
function startKey(e: Evento, from: string, to: string): string {
  if (!e.fecha_inicio) {
    // Taller semanal: el primer día de la ventana que le toca
    let day = from;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (plain(e.horario ?? "").includes(plain(weekdayOf(d)))) {
        day = d;
        break;
      }
    }
    return `${day}T${firstTime(e.horario) ?? "99:99"}`;
  }
  const day = e.fecha_inicio.slice(0, 10) > from ? e.fecha_inicio.slice(0, 10) : from; // ya empezado: cuenta desde hoy
  const time = firstTime(e.horario) ?? firstTime(e.fecha_inicio.slice(11, 16));
  return `${day}T${time ?? "99:99"}`;
}

// Hasta cuántos "Otros planes en Madrid" se preparan (se enseñan poco a poco en la pantalla)
export const MAX_OTHER_PLANS = 60;

// "Otros planes en Madrid": los de la ventana que NO están cerca de casa (a más de NEARBY_KM),
// menos los que ya salen arriba (exclude), con las mismas reglas que los cercanos y por hora.
export async function getOtherPlans(
  db: SupabaseClient,
  opts: {
    home: { lat: number; lon: number };
    when: PlanWindow;
    exclude: string[];
    recomendaciones: Recomendacion[];
    intereses: string[];
    max?: number;
  }
): Promise<Plan[]> {
  const { home, when, exclude, recomendaciones, intereses, max = MAX_OTHER_PLANS } = opts;
  const [from, to] = windowFor(when);
  const start = `${from}T00:00:00`;
  const end = `${to}T23:59:59`;

  // Sin la descripción (no se enseña en la lista y es lo que más pesa).
  // Dos consultas (cada una trae como mucho 1000 filas): los que empiezan en estos días,
  // del más temprano al más tarde, y los que ya estaban en marcha (exposiciones, talleres semanales).
  const columns =
    "id, fuente, titulo, categoria, fecha_inicio, fecha_fin, horario, recurrente, lugar, direccion, municipio, distrito, lat, lon, url, gratuito, precio, accesibilidad, publico, idioma, imagen";
  const base = () => db.from("v_eventos").select(columns).neq("fuente", "cepi_actividades"); // CEPI: otro perfil
  const [starting, ongoing] = await Promise.all([
    base().gte("fecha_inicio", start).lte("fecha_inicio", end).order("fecha_inicio").limit(1000),
    base().or(`fecha_inicio.is.null,and(fecha_inicio.lt.${start},fecha_fin.gte.${start})`).limit(1000),
  ]);
  const error = starting.error ?? ongoing.error;
  if (error) throw new Error(`No se pudieron cargar los otros planes: ${error.message}`);

  const skip = new Set(exclude);
  const available = availableIn(when, {});
  return ([...(starting.data ?? []), ...(ongoing.data ?? [])] as Omit<Evento, "descripcion">[])
    .map((e) => ({ ...e, descripcion: null }) as Evento)
    .filter((e) => !skip.has(e.id) && available(e))
    .map((e) => ({ e, key: startKey(e, from, to) }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.e.titulo.localeCompare(b.e.titulo))
    .map(({ e }) => buildPlan(e, { home, intereses, recomendaciones }))
    .filter((p) => p.km == null || p.km > NEARBY_KM) // los cercanos van en "Planes cerca de ti"
    .slice(0, max);
}

// Tipo de plan, para no enseñar seguidos varios casi iguales (p. ej. cinco talleres contra la soledad)
const kindOf = (p: Plan) => (p.evento.fuente === "agenda_madrid" ? p.evento.categoria ?? "otros" : p.evento.fuente);

// Mantiene el orden por puntuación, pero sin dos seguidos del mismo tipo (si se puede)
// y con 3 como mucho de cada tipo, para que la lista sea variada
const MAX_PER_KIND = 3;

function mixKinds(plans: Plan[], perKind = MAX_PER_KIND): Plan[] {
  const pool = [...plans];
  const out: Plan[] = [];
  const count = new Map<string, number>();
  const room = (p: Plan) => (count.get(kindOf(p)) ?? 0) < perKind;
  while (pool.length) {
    const prev = out.at(-1);
    let i = pool.findIndex((p) => room(p) && (!prev || kindOf(p) !== kindOf(prev)));
    if (i < 0) i = pool.findIndex(room);
    if (i < 0) break; // solo quedan tipos que ya tienen 3
    const [p] = pool.splice(i, 1);
    count.set(kindOf(p), (count.get(kindOf(p)) ?? 0) + 1);
    out.push(p);
  }
  return out;
}

// Un evento con lo que hace falta para enseñarlo como plan: distancia, quién lo recomienda y gustos
export function buildPlan(
  e: Evento,
  opts: { home: { lat: number; lon: number }; intereses: string[]; recomendaciones: Recomendacion[] }
): Plan {
  const rec = opts.recomendaciones.find((r) => r.evento_id === e.id);
  return {
    evento: e,
    km: e.lat != null && e.lon != null ? distanceKm(opts.home, { lat: e.lat, lon: e.lon }) : null,
    recomendadoPor: rec?.de_nombre ?? null,
    mensaje: rec?.mensaje ?? null,
    gusto: matchingInterest(e, opts.intereses),
  };
}

// Recomendaciones pendientes que me han hecho mis familiares (la más reciente primero)
export async function getPendingRecommendations(db: SupabaseClient, userId: string): Promise<Recomendacion[]> {
  const { data, error } = await db
    .from("mm_recomendaciones")
    .select("id, evento_id, de, mensaje")
    .eq("para", userId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data?.length) return [];

  // Nombre de quien recomienda (las reglas de seguridad dejan ver el perfil de un vínculo aceptado)
  const { data: perfiles } = await db.from("mm_perfiles").select("id, nombre").in("id", [...new Set(data.map((r) => r.de))]);
  const names = new Map((perfiles ?? []).map((p) => [p.id as string, p.nombre as string]));
  return data.map((r) => ({
    id: r.id,
    evento_id: r.evento_id,
    de_nombre: names.get(r.de) || "Tu familiar",
    mensaje: r.mensaje?.trim() || null,
  }));
}

// Ids de los planes a los que ya me he apuntado
export async function getMyInscriptionIds(db: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await db.from("mm_inscripciones").select("evento_id").eq("usuario", userId);
  return (data ?? []).map((r) => r.evento_id as string);
}

// Cuándo es, en palabras: "Mañana, jueves 23 de octubre, a las 5 de la tarde"
// opts.on: día elegido en el calendario; un plan que empezó antes de ese día se dice "Hasta el…"
export function whenInWords(e: Evento, opts: { on?: string } = {}): string {
  if (!e.fecha_inicio) return e.horario ?? "Consultar el horario";
  const today = todayIso();
  const startDay = e.fecha_inicio.slice(0, 10);
  const endDay = e.fecha_fin?.slice(0, 10);
  const started = opts.on ? startDay < opts.on : startDay <= today;
  // Dura varios días y ya ha empezado: "Hasta el 30 de noviembre"
  if (endDay && endDay > startDay && started) {
    const [, m, d] = endDay.split("-").map(Number);
    const until = `Hasta el ${d} de ${MONTHS[m - 1]}`;
    return e.horario ? `${until}, ${e.horario}` : until;
  }
  const long = formatWhenLong(e);
  const rel = formatDay(e.fecha_inicio);
  return rel === "Hoy" || rel === "Mañana" ? `${rel}, ${long[0].toLowerCase()}${long.slice(1)}` : long;
}

// "te gusta la música": cómo se dice cada interés en la frase de "¿Por qué este plan?"
const INTEREST_PHRASES: Record<string, string> = {
  Cultura: "te gusta la cultura",
  Música: "te gusta la música",
  "Teatro y cine": "te gustan el teatro y el cine",
  Talleres: "te gustan los talleres",
  Deporte: "te gusta el deporte",
  Naturaleza: "te gusta la naturaleza",
  Lectura: "te gusta la lectura",
  Gastronomía: "te gusta la gastronomía",
  Idiomas: "te gustan los idiomas",
  Tecnología: "te gusta la tecnología",
  Voluntariado: "te gusta ayudar a los demás",
  Baile: "te gusta el baile",
};

// Frase corta que explica por qué se le propone el plan (como mucho 3 motivos)
// "Te lo proponemos porque te gusta la lectura, está a 9 minutos andando de tu casa y es gratis."
type From = "aqui" | "cp" | "casa" | "centro";

// " de tu casa" / " de donde estás" / " de tu código postal" / "" (si no sabemos dónde vive)
export function fromWhere(kind: From): string {
  return { casa: " de tu casa", aqui: " de donde estás", cp: " de tu código postal", centro: "" }[kind];
}

export function whyThisPlan(p: Plan, opts: { minutes: number | null; from: From }): string {
  const e = p.evento;
  const reasons: string[] = [];
  if (p.gusto) reasons.push(INTEREST_PHRASES[p.gusto] ?? `encaja con tus gustos (${p.gusto.toLowerCase()})`);
  if (e.fuente === "juntos_contra_soledad") reasons.push("es un taller para conocer gente nueva");
  else if (/mayores/i.test(e.publico ?? "")) reasons.push("está pensado para personas mayores");
  if (opts.minutes != null && opts.minutes <= 20) {
    reasons.push(`está a ${opts.minutes} minutos andando${fromWhere(opts.from)}`);
  }
  if (e.gratuito) reasons.push("es gratis");
  if (isAccessible(e)) reasons.push("se puede ir en silla de ruedas");

  const list = (r: string[]) => (r.length > 1 ? `${r.slice(0, -1).join(", ")} y ${r.at(-1)}` : r[0]);
  if (p.recomendadoPor) {
    const extra = reasons.slice(0, 2);
    return `${p.recomendadoPor} te lo ha recomendado${extra.length ? `. Además, ${list(extra)}` : ""}.`;
  }
  if (reasons.length === 0) return "Es uno de los planes más cercanos a tu casa para estos días.";
  return `Te lo proponemos porque ${list(reasons.slice(0, 3))}.`;
}
