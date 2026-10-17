// Parte 2 del bot: QUÉ HACEN los botones. Recibe el botón que ha tocado la persona y
// cambia la base de datos (performBotAction). Cada canal escribe después su respuesta:
// el chat de WhatsApp con handleBotButton (aquí abajo) y los avisos de la app con frases cortas.
// No sabe por dónde ha llegado el toque. Las reglas de seguridad (RLS) de mm_inscripciones y
// mm_recomendaciones impiden tocar datos de otra persona aunque alguien fabrique un botón a mano.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvent, type Evento } from "../data";
import { findConflict, getMyAgenda } from "../simpleAgenda";
import { confirmationMessage } from "./mensajes";
import { buttonId, parseButtonId, type BotAction, type BotButton, type BotMessage } from "./tipos";

export type ActionResult =
  | { status: "ok"; action: BotAction; evento: Evento; conflict: Evento | null }
  | { status: "error" | "unknown" | "gone" }; // fallo al guardar · botón raro · el plan ya no existe

async function isJoined(db: SupabaseClient, userId: string, eventoId: string): Promise<boolean> {
  const { data } = await db.from("mm_inscripciones").select("id").eq("usuario", userId).eq("evento_id", eventoId).maybeSingle();
  return !!data;
}

async function join(db: SupabaseClient, userId: string, eventoId: string): Promise<boolean> {
  const { error } = await db.from("mm_inscripciones").insert({ evento_id: eventoId });
  // 23505 = ya estaba apuntada: para la persona es lo mismo
  if (error && error.code !== "23505") return false;
  // Si era un plan recomendado por un familiar, la recomendación queda aceptada
  await db.from("mm_recomendaciones").update({ estado: "aceptada" }).eq("para", userId).eq("evento_id", eventoId).eq("estado", "pendiente");
  return true;
}

export async function performBotAction(db: SupabaseClient, userId: string, id: string): Promise<ActionResult> {
  const parsed = parseButtonId(id);
  if (!parsed) return { status: "unknown" };
  const evento = await getEvent(db, parsed.eventoId);
  if (!evento) return { status: "gone" };
  const ok = (conflict: Evento | null = null): ActionResult => ({ status: "ok", action: parsed.action, evento, conflict });

  switch (parsed.action) {
    // "Sí, voy": no hay columna de "confirmado"; se comprueba que sigue apuntada (y si no, se la apunta)
    case "voy":
      return (await isJoined(db, userId, evento.id)) || (await join(db, userId, evento.id)) ? ok() : { status: "error" };

    // "Ya no puedo ir": se borra la inscripción
    case "no_puedo": {
      const { error } = await db.from("mm_inscripciones").delete().eq("usuario", userId).eq("evento_id", evento.id);
      return error ? { status: "error" } : ok();
    }

    // "Me apunto" (recomendación) o "Me vuelvo a apuntar" (avisa si coincide con otro plan)
    case "apuntarme": {
      const conflict = await findConflict(db, userId, evento);
      return (await join(db, userId, evento.id)) ? ok(conflict) : { status: "error" };
    }

    // "No, gracias": la recomendación queda descartada
    case "no_gracias": {
      const { error } = await db
        .from("mm_recomendaciones")
        .update({ estado: "descartada" })
        .eq("para", userId)
        .eq("evento_id", evento.id)
        .eq("estado", "pendiente");
      return error ? { status: "error" } : ok();
    }
  }
}

// ---------------------------------------------------------------------
// Respuestas del chat (canal WhatsApp, hoy simulado)
// ---------------------------------------------------------------------
let replyCount = 0;
const reply = (text: string, buttons: BotButton[] = []): BotMessage => ({
  id: `respuesta:${Date.now()}:${replyCount++}`,
  at: Date.now(),
  text,
  buttons,
});

export async function handleBotButton(db: SupabaseClient, userId: string, nombre: string, id: string): Promise<BotMessage[]> {
  const r = await performBotAction(db, userId, id);
  if (r.status !== "ok") {
    return [
      reply(
        {
          unknown: "Perdona, no he entendido ese botón.",
          gone: "Ese plan ya no está disponible. Puede que haya terminado o se haya cancelado.",
          error: "Perdona, no hemos podido hacerlo. Inténtalo otra vez dentro de un rato.",
        }[r.status]
      ),
    ];
  }

  const { evento, conflict } = r;
  switch (r.action) {
    case "voy":
      return [reply("¡Estupendo! Te esperamos.")];
    case "no_puedo":
      return [
        reply(`Vale. Te hemos quitado de «${evento.titulo}». ¡Otra vez será!`, [
          { kind: "reply", id: buttonId("apuntarme", evento.id), label: "Me vuelvo a apuntar" },
        ]),
      ];
    case "apuntarme": {
      // La misma confirmación que llega al apuntarse desde cualquier otra pantalla
      const item = (await getMyAgenda(db, userId)).find((a) => a.evento.id === evento.id);
      const messages = item
        ? [confirmationMessage(item, { id: `respuesta:${Date.now()}:${replyCount++}`, at: Date.now(), nombre })]
        : [reply(`¡Hecho! Te has apuntado a *${evento.titulo}*.`)];
      if (conflict) messages.push(reply(`Ojo: a esa hora también tienes *${conflict.titulo}*. Si no puedes ir a los dos, quita uno en «Mis planes».`));
      return messages;
    }
    case "no_gracias":
      return [reply("Vale, no pasa nada. Te seguiremos avisando de otros planes.")];
  }
}
