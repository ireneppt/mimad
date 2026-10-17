// Parte 2 del bot: QUÉ HACEN los botones. Recibe el botón que ha tocado la persona,
// cambia la base de datos y devuelve lo que responde el bot.
// No sabe por dónde ha llegado el toque (pantalla simulada o WhatsApp): eso es cosa del canal.
// Las reglas de seguridad (RLS) de mm_inscripciones y mm_recomendaciones impiden tocar
// datos de otra persona aunque alguien fabrique un botón a mano.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvent, type Evento } from "../data";
import { findConflict } from "../simpleAgenda";
import { whenInWords } from "../simplePlans";
import { directionsUrl } from "./mensajes";
import { buttonId, parseButtonId, type BotButton, type BotMessage } from "./tipos";

let replyCount = 0;
const reply = (text: string, buttons: BotButton[] = []): BotMessage => ({ id: `respuesta:${Date.now()}:${replyCount++}`, text, buttons });

const directions = (e: Evento): BotButton[] => {
  const url = directionsUrl(e);
  return url ? [{ kind: "url", label: "Cómo llegar", url }] : [];
};

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

const SORRY = "Perdona, no hemos podido hacerlo. Inténtalo otra vez dentro de un rato.";

export async function handleBotButton(db: SupabaseClient, userId: string, id: string): Promise<BotMessage[]> {
  const parsed = parseButtonId(id);
  if (!parsed) return [reply("Perdona, no he entendido ese botón.")];
  const evento = await getEvent(db, parsed.eventoId);
  if (!evento) return [reply("Ese plan ya no está disponible. Puede que haya terminado o se haya cancelado.")];
  const title = `«${evento.titulo}»`;

  switch (parsed.action) {
    // "Sí, voy": no hay columna de "confirmado"; se comprueba que sigue apuntada (y si no, se la apunta)
    case "voy": {
      if (!(await isJoined(db, userId, evento.id)) && !(await join(db, userId, evento.id))) return [reply(SORRY)];
      return [reply("¡Estupendo! Te esperamos.")];
    }

    // "Ya no puedo ir": se borra la inscripción (con opción de deshacer)
    case "no_puedo": {
      const { error } = await db.from("mm_inscripciones").delete().eq("usuario", userId).eq("evento_id", evento.id);
      if (error) return [reply(SORRY)];
      return [
        reply(`Vale. Te hemos quitado de ${title}. ¡Otra vez será!`, [
          { kind: "reply", id: buttonId("apuntarme", evento.id), label: "Me vuelvo a apuntar" },
        ]),
      ];
    }

    // "Me apunto" (recomendación) o "Me vuelvo a apuntar"
    case "apuntarme": {
      const conflict = await findConflict(db, userId, evento);
      if (!(await join(db, userId, evento.id))) return [reply(SORRY)];
      const when = whenInWords(evento).split("\n")[0];
      const messages = [reply(`¡Hecho! Te hemos apuntado a *${evento.titulo}*.\n${when}.\nTe lo recordaremos por aquí.`, directions(evento))];
      if (conflict) messages.push(reply(`Ojo: a esa hora también tienes *${conflict.titulo}*. Si no puedes ir a los dos, quita uno en «Mis planes».`));
      return messages;
    }

    // "No, gracias": la recomendación queda descartada
    case "no_gracias": {
      const { error } = await db
        .from("mm_recomendaciones")
        .update({ estado: "descartada" })
        .eq("para", userId)
        .eq("evento_id", evento.id)
        .eq("estado", "pendiente");
      if (error) return [reply(SORRY)];
      return [reply("Vale, no pasa nada. Te seguiremos avisando de otros planes.")];
    }
  }
}
