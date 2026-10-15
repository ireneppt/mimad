import { logout } from "@/app/(auth)/actions";
import UnderConstruction from "@/components/UnderConstruction";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";

export const metadata = { title: "Inicio · MiMad simplificada" };

// Inicio de la versión simplificada: provisional hasta hacer la pantalla (diseño inicio-simplificada.png)
export default async function SimpleHomePage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);

  return (
    <UnderConstruction title={perfil ? `Hola, ${perfil.nombre}` : "Inicio simplificado"} task="inicio de la versión simplificada">
      <form action={logout}>
        <button type="submit" className="mt-4 h-14 rounded-2xl border-2 border-slate-500 px-6 text-xl font-semibold">
          Salir
        </button>
      </form>
    </UnderConstruction>
  );
}
