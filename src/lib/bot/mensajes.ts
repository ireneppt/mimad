// Parte 1 del bot: QUÉ mensajes enviar a una persona.
// Mira su próximo plan (mm_inscripciones) y las recomendaciones pendientes de sus
// familiares (mm_recomendaciones) y prepara los mensajes con sus botones.
// No sabe nada de pantallas ni de WhatsApp: eso es cosa del canal (canal.ts).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Evento } from "../data";
import { getEventsByIds } from "../data";
import { getMyAgenda, relativeWhen, type AgendaItem } from "../simpleAgenda";
import { getPendingRecommendations, whenInWords, type Recomendacion } from "../simplePlans";
import { buttonId, type BotButton, type BotMessage } from "./tipos";

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

// Recordatorio del próximo plan: "Te recordamos que *mañana, a las 5 de la tarde* tienes…"
export function reminderMessage(item: AgendaItem, nombre: string): BotMessage {
  const e = item.evento;
  // Sin repetir el sitio si ya va en el título ("Talleres Soledad en Centro … Ouka Leele")
  const place = [e.lugar ?? e.direccion].find((p) => p && !e.titulo.toLowerCase().includes(p.toLowerCase()));
  return {
    id: `recordatorio:${e.id}`,
    text:
      `${hello(nombre)}. Te recordamos que *${lowerFirst(relativeWhen(item))}* tienes *${e.titulo}*` +
      `${place ? ` en ${place}` : ""}.\n¿Sigues pudiendo ir?`,
    buttons: [
      { kind: "reply", id: buttonId("voy", e.id), label: "Sí, voy" },
      ...directionsButton(e),
      { kind: "reply", id: buttonId("no_puedo", e.id), label: "Ya no puedo ir" },
    ],
  };
}

// Recomendación de un familiar: tarjeta con el plan y "Me apunto" / "No, gracias"
export function recommendationMessage(rec: Recomendacion, e: Evento): BotMessage {
  const price = e.gratuito ? "Gratis" : e.precio ? e.precio.split("\n")[0] : null;
  const lines = [
    `*${rec.de_nombre} te recomienda un plan:*`,
    e.titulo,
    [whenInWords(e).split("\n")[0], price].filter(Boolean).join(" · "),
    rec.mensaje ? `«${rec.mensaje}»` : null,
  ];
  return {
    id: `recomendacion:${rec.id}`,
    text: lines.filter(Boolean).join("\n"),
    card: { categoria: e.categoria, imagen: e.imagen ?? null },
    buttons: [
      { kind: "reply", id: buttonId("apuntarme", e.id), label: "Me apunto" },
      { kind: "reply", id: buttonId("no_gracias", e.id), label: "No, gracias" },
    ],
  };
}

// Todos los avisos de ahora para esta persona: su próximo plan y sus recomendaciones
export async function getBotMessages(db: SupabaseClient, userId: string, nombre: string): Promise<BotMessage[]> {
  const [agenda, recs] = await Promise.all([getMyAgenda(db, userId), getPendingRecommendations(db, userId)]);
  const recEvents = await getEventsByIds(db, recs.map((r) => r.evento_id));
  const byId = new Map(recEvents.map((e) => [e.id, e]));

  const messages: BotMessage[] = [];
  if (agenda[0]) messages.push(reminderMessage(agenda[0], nombre));
  for (const rec of recs) {
    const e = byId.get(rec.evento_id); // si el plan ya ha terminado, no sale en v_eventos
    if (e) messages.push(recommendationMessage(rec, e));
  }
  if (messages.length === 0) {
    messages.push({
      id: "nada",
      text: `${hello(nombre)}. Ahora mismo no tienes planes apuntados ni recomendaciones.\nCuando te apuntes a un plan, te lo recordaremos por aquí.`,
      buttons: [{ kind: "url", label: "Ver planes", url: "/simple/planes" }],
    });
  }
  return messages;
}
