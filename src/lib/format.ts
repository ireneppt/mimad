// Textos de fechas, horas y distancias en español, para las dos versiones.
import type { Evento } from "./data";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Las fechas de v_eventos vienen en hora de Madrid sin zona ("2026-10-23T17:00:00").
// Se leen tal cual, sin convertir de zona horaria.
function parseLocal(s: string): Date {
  const [d, t = "00:00"] = s.replace(" ", "T").split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return new Date(y, m - 1, day, hh || 0, mm || 0);
}

// "Hoy" en Madrid, con la misma representación que parseLocal
function todayInMadrid(): Date {
  const s = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }); // "2026-10-15 18:05:00"
  return parseLocal(s);
}

function dayDiff(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((da - db) / 86_400_000);
}

const hhmm = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

// "Hoy", "Mañana", "Jueves 23 oct."
export function formatDay(s: string): string {
  const d = parseLocal(s);
  const diff = dayDiff(d, todayInMadrid());
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  const wd = WEEKDAYS[d.getDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}.`;
}

// Resumen de cuándo es un evento, para tarjetas: { day, time }
export function formatWhen(e: Evento): { day: string; time: string | null } {
  if (e.fuente === "cepi_actividades" && e.fecha_inicio) {
    return { day: `Durante ${MONTHS[parseLocal(e.fecha_inicio).getMonth()]}`, time: null };
  }
  if (!e.fecha_inicio) {
    return { day: e.horario ?? "Consultar horario", time: null }; // recurrentes: "Cada jueves, 16:00 - 17:30"
  }
  const start = parseLocal(e.fecha_inicio);
  const end = e.fecha_fin ? parseLocal(e.fecha_fin) : null;
  const today = todayInMadrid();
  // "00:00" en la agenda = sin hora concreta
  const horario = e.horario && e.horario !== "00:00" ? e.horario : null;
  const time = horario ?? (start.getHours() || start.getMinutes() ? hhmm(start) : null);

  // Evento que dura varios días y ya ha empezado: "Hasta el 30 nov."
  if (end && dayDiff(end, start) > 0 && dayDiff(start, today) <= 0) {
    return { day: `Hasta el ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)}.`, time };
  }
  return { day: formatDay(e.fecha_inicio), time };
}

// Para la versión simplificada: "Jueves 23 de octubre, a las 5 de la tarde"
export function formatWhenLong(e: Evento): string {
  if (!e.fecha_inicio) return e.horario ?? "Consultar horario";
  const d = parseLocal(e.fecha_inicio);
  const wd = WEEKDAYS[d.getDay()];
  const day = `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  if (!d.getHours() && !d.getMinutes()) return day;
  return `${day}, ${hourInWords(d.getHours(), d.getMinutes())}`;
}

// 17, 30 → "a las 5 y 30 de la tarde"; 13, 0 → "a la 1 del mediodía"
export function hourInWords(h: number, m: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const part = h < 6 ? "de la madrugada" : h < 12 ? "de la mañana" : h < 14 ? "del mediodía" : h < 21 ? "de la tarde" : "de la noche";
  const min = m ? ` y ${m}` : "";
  return `${h12 === 1 ? "a la" : "a las"} ${h12}${min} ${part}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

// Para la versión simplificada: minutos andando (unos 4,5 km/h)
export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.5) * 60));
}

// "CALLE BRONCE 16" → "Calle Bronce 16" (algunas fuentes vienen en mayúsculas)
export function niceText(s: string | null): string | null {
  if (!s) return null;
  if (s !== s.toUpperCase()) return s;
  const small = new Set(["de", "del", "la", "las", "el", "los", "y", "en"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// "Duración: 2 horas" (solo si la hora de fin es real: en la agenda, 23:59 = "sin hora de fin")
export function formatDuration(e: Evento): string | null {
  if (!e.fecha_inicio || !e.fecha_fin) return null;
  if (e.fecha_inicio.slice(0, 10) !== e.fecha_fin.slice(0, 10) || e.fecha_fin.slice(11, 16) === "23:59") return null;
  const mins = (parseLocal(e.fecha_fin).getTime() - parseLocal(e.fecha_inicio).getTime()) / 60_000;
  if (!(mins > 0) || mins > 10 * 60) return null;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} minutos`;
  const hours = h === 1 ? "1 hora" : `${h} horas`;
  return m ? `${hours} y ${m} min` : hours;
}

// "Jueves 23 de octubre · 17:00" para el detalle
export function formatLongDate(e: Evento): string | null {
  if (!e.fecha_inicio) return null;
  const d = parseLocal(e.fecha_inicio);
  const wd = WEEKDAYS[d.getDay()];
  const day = `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  return d.getHours() || d.getMinutes() ? `${day} · ${hhmm(d)}` : day;
}
