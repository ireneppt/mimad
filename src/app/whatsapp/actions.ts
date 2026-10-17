"use server";

// Canal simulado: cuando se toca un botón en /whatsapp, se le pasa a la parte que decide
// qué hace (lib/bot/botones.ts) y se devuelve la respuesta del bot para pintarla.
// El día que haya WhatsApp de verdad, esto lo hará el webhook (ver lib/bot/canal.ts).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { handleBotButton } from "@/lib/bot/botones";
import type { BotMessage } from "@/lib/bot/tipos";

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
