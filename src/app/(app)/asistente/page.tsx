import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import BackButton from "@/components/BackButton";
import AssistantChat from "./AssistantChat";

export const metadata = { title: "Asistente · MiMad" };

// Asistente (diseño asistente.png): chat que recomienda planes reales de los datos abiertos.
// Las respuestas llegan de /api/asistente (Claude si hay clave; si no, reglas).
export default async function AssistantPage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const origin = await getOrigin(perfil);
  const donde = {
    aqui: "de donde estás",
    cp: `de tu código postal (${origin.cp})`,
    casa: perfil?.barrio || perfil?.municipio ? `de ${perfil.barrio || perfil.municipio}` : "de tu casa",
    centro: "del centro de Madrid",
  }[origin.kind];
  const saludo = `¡Hola${perfil?.nombre ? `, ${perfil.nombre}` : ""}! Cuéntame qué te apetece y te busco planes cerca ${donde}.`;

  return (
    <main className="flex min-h-[calc(100dvh-7rem)] flex-col bg-slate-50 text-tinta">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <BackButton />
        <Image src="/icono.svg" alt="" width={48} height={48} />
        <div>
          <h1 className="text-xl font-bold leading-tight">Asistente MiMad</h1>
          <p className="flex items-center gap-1.5 text-gris">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden="true" /> Planes según tus gustos
          </p>
        </div>
      </header>
      <AssistantChat saludo={saludo} loggedIn={!!perfil} />
    </main>
  );
}
