import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "../SignupForm";

export const metadata = { title: "Crear cuenta de entidad · MiMad" };

// Registro de entidades (diseño crear-cuenta-entidad.png): el mismo formulario que el de
// persona, con el nombre de la entidad y su NIF verificado contra el Registro oficial.
export default async function EntitySignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("v_municipios").select("nombre").order("nombre");
  return (
    <AuthShell tab="registro">
      <SignupForm municipios={(data ?? []).map((m) => m.nombre as string)} kind="entidad" />
    </AuthShell>
  );
}
