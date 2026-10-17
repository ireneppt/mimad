"use server";

// Canal "avisos de la app" (versión simplificada). Usa las mismas piezas que el WhatsApp
// simulado: los mensajes salen de lib/bot/mensajes.ts y los botones hacen lo mismo que
// en lib/bot/botones.ts; aquí solo se eligen las frases cortas de la respuesta.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAppNotices, type AppNotice } from "@/lib/bot/mensajes";
import { performBotAction } from "@/lib/bot/botones";

// null = sin sesión; enabled = false si ha desactivado los avisos en su perfil
export async function getSimpleNotices(): Promise<{ enabled: boolean; items: AppNotice[] } | null> {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null;
  if (perfil.avisos_app === false) return { enabled: false, items: [] };
  return { enabled: true, items: await getAppNotices(supabase, perfil.id) };
}

export async function pressNotice(buttonId: string): Promise<{ ok: boolean; text: string }> {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return { ok: false, text: "Tienes que volver a entrar en MiMad." };

  const r = await performBotAction(supabase, perfil.id, String(buttonId).slice(0, 260));
  if (r.status === "gone") return { ok: false, text: "Este plan ya no está disponible." };
  if (r.status !== "ok") return { ok: false, text: "No se ha podido hacer. Prueba otra vez." };
  revalidatePath("/", "layout"); // la agenda y los planes cambian

  if (r.action === "no_puedo") return { ok: true, text: "Vale. Te hemos quitado del plan." };
  if (r.action === "apuntarme")
    return {
      ok: true,
      text: r.conflict ? `¡Hecho! Te has apuntado. Ojo: a esa hora también tienes «${r.conflict.titulo}».` : "¡Hecho! Te has apuntado. Lo tienes en Mis planes.",
    };
  return { ok: true, text: "¡Hecho!" };
}
