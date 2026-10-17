// Parte 1 del bot: QUÉ mensajes enviar a una persona y CUÁNDO.
//   - Al apuntarse a un plan: confirmación (a la hora en que se apuntó, mm_inscripciones.created_at).
//   - 24 horas antes del plan: recordatorio, solo si se apuntó con más de 24 horas de antelación
//     (si faltaba menos, con la confirmación basta).
//   - Recomendación de un familiar: a la hora en que se hizo (mm_recomendaciones).
// Cada mensaje lleva su hora (at). getBotMessages devuelve los que ya han "llegado" a esta hora.
// No sabe nada de pantallas ni de WhatsApp: eso es cosa del canal (canal.ts).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Evento } from "../data";
import { getEventsByIds } from "../data";
import { hourInWords } from "../format";
import { fullDate, getMyAgenda, type AgendaItem } from "../simpleAgenda";
import { getPendingRecommendations, whenInWords, type Recomendacion } from "../simplePlans";
import { buttonId, type BotButton, type BotMessage } from "./tipos";

const DAY_MS = 24 * 60 * 60 * 1000;

// "Cómo llegar": Google Maps con la dirección del plan (o sus coordenadas si no hay dirección)
export function directionsUrl(e: Evento): string | null {
  const place = [e.direccion ?? e.lugar, e.municipio].filter(Boolean).join(", ");
  const destination = place || (e.lat != null && e.lon != null ? `${e.lat},${e.lon}` : null);
  return destination ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination })}` : null;
}

const directionsButton = (e: Evento): BotButton[] => {
  const url = directionsUrl(e);
  return url ? [{ kind: "url", label: "Cómo llegar", url }] : [];
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const hello = (nombre: string) => (nombre ? `Hola, ${nombre}` : "Hola");

// Sin repetir el sitio si ya va en el título ("Talleres Soledad en Centro … Ouka Leele")
const placeOf = (e: Evento) => [e.lugar ?? e.direccion].find((p) => p && !e.titulo.toLowerCase().includes(p.toLowerCase()));

// Hora de Madrid ("2026-10-20", "17:00") → instante (milisegundos), con el horario de verano bien
export function madridTime(date: string, time: string | null): number {
  const asUtc = Date.parse(`${date}T${time ?? "00:00"}:00Z`);
  const local = new Date(asUtc).toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).replace(" ", "T");
  const offset = Date.parse(`${local}Z`) - asUtc; // +1 h en invierno, +2 h en verano
  return asUtc - offset;
}

// Cuándo empieza la próxima sesión del plan
export const startOf = (item: AgendaItem) => madridTime(item.date, item.time);

// Confirmación al apuntarse: "¡Hecho! Te has apuntado a *…*. Es *el martes, a las 10 de la mañana*…"
export function confirmationMessage(item: AgendaItem, opts: { id: string; at: number; nombre: string }): BotMessage {
  const e = item.evento;
  const place = placeOf(e);
  const longEnough = startOf(item) - opts.at > DAY_MS;
  return {
    id: opts.id,
    at: opts.at,
    text:
      `¡Hecho${opts.nombre ? `, ${opts.nombre}` : ""}! Te has apuntado a *${e.titulo}*${/[.!?…]$/.test(e.titulo) ? "" : "."}\n` +
      `Es *${lowerFirst(fullDate(item))}*${place ? ` en ${place}` : ""}.` +
      (longEnough ? "\nTe lo recordaremos el día antes." : ""),
    buttons: [...directionsButton(e), { kind: "reply", id: buttonId("no_puedo", e.id), label: "Ya no puedo ir" }],
  };
}

// Recordatorio 24 horas antes: "Te recordamos que *mañana, a las 5 de la tarde* tienes…"
// (siempre "mañana": el mensaje llega justo un día antes, aunque se lea más tarde)
export function reminderMessage(item: AgendaItem, opts: { id: string; at: number; nombre: string }): BotMessage {
  const e = item.evento;
  const place = placeOf(e);
  const [h, m] = (item.time ?? "").split(":").map(Number);
  const when = item.time ? `mañana, ${hourInWords(h, m)}` : "mañana";
  return {
    id: opts.id,
    at: opts.at,
    text: `${hello(opts.nombre)}. Te recordamos que *${when}* tienes *${e.titulo}*${place ? ` en ${place}` : ""}.\n¿Sigues pudiendo ir?`,
    buttons: [
      { kind: "reply", id: buttonId("voy", e.id), label: "Sí, voy" },
      ...directionsButton(e),
      { kind: "reply", id: buttonId("no_puedo", e.id), label: "Ya no puedo ir" },
    ],
  };
}

// Recomendación de un familiar: tarjeta con el plan y "Me apunto" / "No, gracias"
export function recommendationMessage(rec: Recomendacion, e: Evento, at: number): BotMessage {
  const price = e.gratuito ? "Gratis" : e.precio ? e.precio.split("\n")[0] : null;
  const lines = [
    `*${rec.de_nombre} te recomienda un plan:*`,
    e.titulo,
    [whenInWords(e).split("\n")[0], price].filter(Boolean).join(" · "),
    rec.mensaje ? `«${rec.mensaje}»` : null,
  ];
  return {
    id: `recomendacion:${rec.id}`,
    at,
    text: lines.filter(Boolean).join("\n"),
    card: { categoria: e.categoria, imagen: e.imagen ?? null },
    buttons: [
      { kind: "reply", id: buttonId("apuntarme", e.id), label: "Me apunto" },
      { kind: "reply", id: buttonId("no_gracias", e.id), label: "No, gracias" },
    ],
  };
}

// Mensajes de un plan al que está apuntada: la confirmación y, si ya toca, el recordatorio
function planMessages(item: AgendaItem, ins: { id: string; created_at: string }, nombre: string, now: number): BotMessage[] {
  const joinedAt = Date.parse(ins.created_at);
  const start = startOf(item);
  const remindAt = start - DAY_MS;
  const messages = [confirmationMessage(item, { id: `confirmacion:${ins.id}`, at: Math.min(joinedAt, now), nombre })];
  // Recordatorio: si se apuntó antes de las 24 horas previas, ya han llegado y el plan no ha empezado
  if (joinedAt < remindAt && remindAt <= now && now < start) {
    messages.push(reminderMessage(item, { id: `recordatorio:${ins.id}:${item.date}`, at: remindAt, nombre }));
  }
  return messages;
}

// Todos los mensajes que le han llegado hasta ahora, del más antiguo al más reciente
export async function getBotMessages(
  db: SupabaseClient,
  userId: string,
  { nombre, plansHref, now = Date.now() }: { nombre: string; plansHref: string; now?: number }
): Promise<BotMessage[]> {
  const [agenda, inscripciones, recs] = await Promise.all([
    getMyAgenda(db, userId),
    db.from("mm_inscripciones").select("id, evento_id, created_at").eq("usuario", userId),
    getPendingRecommendations(db, userId),
  ]);
  const insByEvent = new Map((inscripciones.data ?? []).map((i) => [i.evento_id as string, i as { id: string; created_at: string }]));
  const [recEvents, recDates] = await Promise.all([
    getEventsByIds(db, recs.map((r) => r.evento_id)),
    recs.length ? db.from("mm_recomendaciones").select("id, created_at").in("id", recs.map((r) => r.id)) : Promise.resolve({ data: [] }),
  ]);
  const eventById = new Map(recEvents.map((e) => [e.id, e]));
  const recAt = new Map((recDates.data ?? []).map((r) => [r.id as string, Date.parse(r.created_at as string)]));

  const messages: BotMessage[] = [];
  for (const item of agenda) {
    const ins = insByEvent.get(item.evento.id);
    if (ins) messages.push(...planMessages(item, ins, nombre, now));
  }
  for (const rec of recs) {
    const e = eventById.get(rec.evento_id); // si el plan ya ha terminado, no sale en v_eventos
    if (e) messages.push(recommendationMessage(rec, e, Math.min(recAt.get(rec.id) ?? now, now)));
  }
  messages.sort((a, b) => a.at - b.at);

  if (messages.length === 0) {
    messages.push({
      id: "nada",
      at: now,
      text: `${hello(nombre)}. Ahora mismo no tienes planes apuntados ni recomendaciones.\nCuando te apuntes a un plan, te avisaremos por aquí.`,
      buttons: [{ kind: "url", label: "Ver planes", url: plansHref }],
    });
  }
  return messages;
}
