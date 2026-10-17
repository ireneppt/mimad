"use server";

// Canal simulado del bot (ver lib/bot/canal.ts). No envía nada fuera de la app:
//   - pressButton: al tocar un botón en /whatsapp, se pasa a lib/bot/botones.ts y se
//     devuelve la respuesta del bot para pintarla.
//   - getWhatsappNotice: los mensajes que han llegado, para la notificación simulada
//     que sale en el resto de pantallas (components/WhatsappNotice.tsx).
// El día que haya WhatsApp de verdad, esto lo harán el webhook y la tarea programada.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { handleBotButton } from "@/lib/bot/botones";
import { getBotMessages } from "@/lib/bot/mensajes";
import type { BotMessage } from "@/lib/bot/tipos";
import { getCurrentProfile } from "@/lib/profile";

export async function pressButton(buttonId: string): Promise<BotMessage[]> {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return [{ id: `sin-sesion:${Date.now()}`, at: Date.now(), text: "Tu sesión ha caducado. Vuelve a entrar en MiMad.", buttons: [] }];
  const messages = await handleBotButton(supabase, perfil.id, perfil.nombre ?? "", String(buttonId).slice(0, 260));
  // La agenda y los planes cambian si se apunta o se desapunta
  revalidatePath("/", "layout");
  return messages;
}

// Lo que enseña la notificación: un resumen de cada mensaje que ha llegado (del más
// antiguo al más reciente). null si no hay sesión o no quiere avisos por WhatsApp.
export type NoticeItem = { id: string; at: number; preview: string };

export async function getWhatsappNotice(): Promise<NoticeItem[] | null> {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil || !perfil.avisos_whatsapp) return null;
  const messages = await getBotMessages(supabase, perfil.id, { nombre: perfil.nombre ?? "", plansHref: "/" });
  const plain = (s: string) => s.replace(/\*/g, "").replace(/\s*\n\s*/g, " ").trim();
  return messages.filter((m) => m.id !== "nada").map((m) => ({ id: m.id, at: m.at, preview: plain(m.text) }));
}
