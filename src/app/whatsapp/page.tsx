import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getBotMessages } from "@/lib/bot/mensajes";
import ChatView from "./ChatView";

export const metadata = { title: "Avisos por WhatsApp (simulación) · MiMad" };

// Simulación del bot de avisos de MiMad (mitad derecha de disenos/notificaciones.png),
// para la versión simplificada y la normal. Es el "canal simulado" del bot: no envía nada
// fuera de la app (ver lib/bot/canal.ts).
export default async function WhatsappSimulationPage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) redirect("/login?next=/whatsapp"); // el middleware ya lo exige; por si acaso

  const home = perfil.simplificada ? "/simple" : "/";
  const messages = await getBotMessages(supabase, perfil.id, {
    nombre: perfil.nombre ?? "",
    plansHref: perfil.simplificada ? "/simple/planes" : "/",
  });

  return <ChatView initial={messages} backHref={home} />;
}
