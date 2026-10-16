"use server";

// Interruptor "Versión simplificada" del Inicio: lo guarda en el perfil y abre la versión
// simplificada. (Volver a la versión por defecto está en src/app/simple/perfil/actions.ts.)
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function switchToSimple() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("mm_perfiles").update({ simplificada: true }).eq("id", user.id);
  redirect("/simple");
}
