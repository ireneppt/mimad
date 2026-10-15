import { createClient } from "@/lib/supabase/server";
import SimpleSignup from "./SimpleSignup";

export const metadata = { title: "Crear cuenta · MiMad simplificada" };

export default async function SimpleSignupPage() {
  // Municipios de la Comunidad de Madrid (de los datos abiertos) para el desplegable
  const supabase = await createClient();
  const { data } = await supabase.from("v_municipios").select("nombre").order("nombre");
  const municipios = (data ?? []).map((m) => m.nombre as string);

  return <SimpleSignup municipios={municipios} />;
}
