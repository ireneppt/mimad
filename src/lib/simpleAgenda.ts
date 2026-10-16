// Agenda de la versión simplificada: los planes a los que me he apuntado, ordenados
// por su próxima fecha. Los talleres semanales ("Cada jueves, 16:00") se colocan
// en el próximo jueves para que salgan en su sitio.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEventsByIds, type Evento } from "./data";
import { hourInWords } from "./format";

export type AgendaItem = {
  evento: Evento;
  date: string; // próxima fecha, "2026-10-22"
  time: string | null; // "17:30" (null si no se sabe)
  weekly: boolean; // taller que se repite cada semana
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Ahora en Madrid: "2026-10-16" y "13:05"
function nowInMadrid(): { date: string; time: string } {
  const s = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }); // "2026-10-16 13:05:00"
  return { date: s.slice(0, 10), time: s.slice(11, 16) };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const weekdayIndex = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

// Próxima vez que ocurre el plan (o null si ya ha pasado)
function nextOccurrence(e: Evento): Omit<AgendaItem, "evento"> | null {
  const now = nowInMadrid();
  if (!e.fecha_inicio) {
    // "Cada jueves, 16:00 - 17:30": el próximo jueves (hoy, si aún no ha empezado)
    const horario = plain(e.horario ?? "");
    const day = WEEKDAYS.findIndex((d) => horario.includes(plain(d)));
    if (day < 0) return null;
    const time = horario.match(/(\d{1,2}):(\d{2})/);
    const hhmm = time ? `${time[1].padStart(2, "0")}:${time[2]}` : null;
    let ahead = (day - weekdayIndex(now.date) + 7) % 7;
    if (ahead === 0 && hhmm && hhmm < now.time) ahead = 7;
    return { date: addDays(now.date, ahead), time: hhmm, weekly: true };
  }
  const startDay = e.fecha_inicio.slice(0, 10);
  const endDay = e.fecha_fin?.slice(0, 10) ?? startDay;
  const t = e.fecha_inicio.slice(11, 16);
  const time = t && t !== "00:00" ? t : null;
  if (endDay < now.date) return null;
  // Ya ha empezado y dura varios días: cuenta como hoy
  if (startDay < now.date) return { date: now.date, time, weekly: false };
  return { date: startDay, time, weekly: false };
}

export async function getMyAgenda(db: SupabaseClient, userId: string): Promise<AgendaItem[]> {
  const { data } = await db.from("mm_inscripciones").select("evento_id").eq("usuario", userId);
  // Los planes que ya han terminado no salen en v_eventos: se quedan fuera solos
  const eventos = await getEventsByIds(db, (data ?? []).map((r) => r.evento_id as string));
  return eventos
    .map((evento) => {
      const next = nextOccurrence(evento);
      return next ? { evento, ...next } : null;
    })
    .filter((x): x is AgendaItem => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));
}

// "Hoy", "Mañana", "El jueves" (esta semana) o "Dentro de 8 días"
export function relativeDay(date: string): string {
  const diff = daysBetween(nowInMadrid().date, date);
  if (diff <= 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff < 7) return `El ${WEEKDAYS[weekdayIndex(date)]}`;
  return `Dentro de ${diff} días`;
}

// "Mañana, a las 5 y 30 de la tarde"
export function relativeWhen(item: AgendaItem): string {
  const day = relativeDay(item.date);
  if (!item.time) return day;
  const [h, m] = item.time.split(":").map(Number);
  return `${day}, ${hourInWords(h, m)}`;
}

// "Jueves 22 de octubre, a las 5 de la tarde"
export function fullDate(item: AgendaItem): string {
  const [y, mo, d] = item.date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay()];
  const day = `${wd[0].toUpperCase()}${wd.slice(1)} ${d} de ${MONTHS[mo - 1]}`;
  if (!item.time) return day;
  const [h, m] = item.time.split(":").map(Number);
  return `${day}, ${hourInWords(h, m)}`;
}

// Cuadro de fecha: { weekday: "JUE", day: 22, month: "oct." }
export function dateTile(item: AgendaItem) {
  const [, mo, d] = item.date.split("-").map(Number);
  return {
    weekday: WEEKDAYS[weekdayIndex(item.date)].slice(0, 3).toUpperCase(), // "SÁB", "MIÉ"
    day: d,
    month: `${MONTHS[mo - 1].slice(0, 3)}.`,
  };
}
