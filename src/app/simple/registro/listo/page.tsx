import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import ClearDraft from "./ClearDraft";

export const metadata = { title: "Cuenta creada · MiMad simplificada" };

// Última pantalla del registro simplificado (diseño crear-cuenta-simplificada-pasos-5a7.png)
export default async function SignupDonePage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);

  return (
    <SimpleShell
      defaultHref="/"
      title={perfil ? `¡Ya tienes tu cuenta, ${perfil.nombre}!` : "¡Ya tienes tu cuenta!"}
      intro={<p>A partir de ahora, entra con tu <strong>número de móvil</strong> y tu <strong>contraseña</strong>.</p>}
      help={<ol><li>Toca el botón naranja <strong>Ver actividades</strong>.</li><li>Verás planes cerca de tu casa.</li></ol>}
    >
      <ClearDraft />
      <div className="flex justify-center" aria-hidden="true">
        <span className="flex h-28 w-28 items-center justify-center rounded-full bg-green-50 text-green-700">
          <Check size={64} strokeWidth={3} />
        </span>
      </div>
      <Link
        href="/simple"
        className="bg-degradado-fuerte flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-2xl font-bold text-white shadow-lg shadow-coral/30"
      >
        Ver actividades
        <ArrowRight size={28} aria-hidden="true" />
      </Link>
    </SimpleShell>
  );
}
