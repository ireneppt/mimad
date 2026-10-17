import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAppNotices } from "@/lib/bot/mensajes";
import NoticeList from "./NoticeList";

export const metadata = { title: "Mis avisos · MiMad simplificada" };

// Lista de avisos de la versión simplificada: recomendaciones de la familia y recordatorios
// de los planes (el día antes y el mismo día). Se calculan ahora, según la hora.
export default async function SimpleNoticesPage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const enabled = perfil?.avisos_app !== false;
  const notices = perfil && enabled ? await getAppNotices(supabase, perfil.id) : [];

  return (
    <SimpleShell
      defaultHref="/notificaciones"
      title="Mis avisos"
      intro={
        enabled ? (
          <p>Aquí ves lo que te recomienda tu familia y los recordatorios de tus planes.</p>
        ) : (
          <p>Tienes los avisos <strong>desactivados</strong>.</p>
        )
      }
      help={
        <ol>
          <li>Cada recuadro es un aviso. El más nuevo está arriba.</li>
          <li>Si te recomiendan un plan y te gusta, toca <strong>Me apunto</strong>.</li>
          <li>Para ir a un plan, toca <strong>Cómo llegar</strong>. Se abre el mapa.</li>
          <li>Si ya no puedes ir, toca <strong>Ya no puedo ir</strong>.</li>
        </ol>
      }
    >
      <Link href="/simple" className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold">
        <ArrowLeft size={26} aria-hidden="true" />
        Volver al inicio
      </Link>

      {enabled ? (
        <NoticeList notices={notices} />
      ) : (
        <Link href="/simple/perfil#avisos-app" className="bg-degradado-fuerte flex h-16 items-center justify-center rounded-2xl text-xl font-bold text-white">
          Activar los avisos
        </Link>
      )}
    </SimpleShell>
  );
}
