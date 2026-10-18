"use server";

// Botón «Versión por defecto» del final de cada pantalla simplificada: lo guarda en el perfil
// (si hay sesión) y abre esa misma pantalla en la versión por defecto. Antes era solo un
// enlace y, al volver a entrar, la cuenta seguía en la versión simplificada.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function switchToDefaultVersion(form: FormData) {
  const to = String(form.get("volver") ?? "/");
  // Solo pantallas de la versión por defecto de esta app
  const safe = to.startsWith("/") && !to.startsWith("//") && !to.startsWith("/simple") ? to : "/";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("mm_perfiles").update({ simplificada: false }).eq("id", user.id);
    revalidatePath("/", "layout");
  }
  redirect(safe);
}
