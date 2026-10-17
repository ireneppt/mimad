import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getBotMessages } from "@/lib/bot/mensajes";
import ChatView from "./ChatView";

export const metadata = { title: "Avisos por WhatsApp (simulación) · MiMad" };

// Simulación del bot de avisos de MiMad (mitad derecha de disenos/notificaciones.png).
// Es el "canal simulado" del bot: no envía nada fuera de la app (ver lib/bot/canal.ts).
export default async function WhatsappSimulationPage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) redirect("/login?next=/whatsapp"); // el middleware ya lo exige; por si acaso

  const messages = await getBotMessages(supabase, perfil.id, perfil.nombre ?? "");
  const now = new Date().toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

  return <ChatView initial={messages} startTime={now} backHref={perfil.simplificada ? "/simple" : "/"} />;
}
