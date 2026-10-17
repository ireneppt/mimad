"use server";

// Canal simulado: cuando se toca un botón en /whatsapp, se le pasa a la parte que decide
// qué hace (lib/bot/botones.ts) y se devuelve la respuesta del bot para pintarla.
// El día que haya WhatsApp de verdad, esto lo hará el webhook (ver lib/bot/canal.ts).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { handleBotButton } from "@/lib/bot/botones";
import { getBotMessages } from "@/lib/bot/mensajes";
import type { BotMessage } from "@/lib/bot/tipos";
import { getCurrentProfile } from "@/lib/profile";

// Vista previa para la notificación simulada (como la que enseñaría el móvil al llegar
// un WhatsApp). null si no hay sesión, si no quiere avisos por WhatsApp o si no hay nada.
export type WhatsappNotice = { title: string; body: string; more: number; signature: string };

export async function getWhatsappNotice(): Promise<WhatsappNotice | null> {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil || !perfil.avisos_whatsapp) return null;
  const messages = (await getBotMessages(supabase, perfil.id, perfil.nombre ?? "")).filter((m) => m.id !== "nada");
  if (messages.length === 0) return null;
  const plain = (s: string) => s.replace(/\*/g, "").replace(/\s*\n\s*/g, " ").trim();
  return {
    title: "MiMad",
    body: plain(messages[0].text),
    more: messages.length - 1,
    // Cambia si llega un aviso nuevo: así la notificación vuelve a salir
    signature: messages.map((m) => m.id).join("|"),
  };
}

export async function pressButton(buttonId: string): Promise<BotMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [{ id: `sin-sesion:${Date.now()}`, text: "Tu sesión ha caducado. Vuelve a entrar en MiMad.", buttons: [] }];
  const messages = await handleBotButton(supabase, user.id, String(buttonId).slice(0, 260));
  // La agenda y los planes cambian si se apunta o se desapunta
  revalidatePath("/simple");
  revalidatePath("/agenda");
  return messages;
}
