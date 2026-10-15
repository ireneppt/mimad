import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";

export const metadata = { title: "Crear cuenta · MiMad" };

export default async function SignupPage() {
  // Municipios de la Comunidad de Madrid (de los datos abiertos) para las sugerencias
  const supabase = await createClient();
  const { data } = await supabase.from("v_municipios").select("nombre").order("nombre");
  const municipios = (data ?? []).map((m) => m.nombre as string);

  return (
    <AuthShell tab="registro">
      <SignupForm municipios={municipios} />
    </AuthShell>
  );
}
