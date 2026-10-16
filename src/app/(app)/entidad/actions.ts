"use server";

// Guardar o corregir los datos de la entidad. Al cambiar el NIF, la base de datos lo
// vuelve a verificar contra el Registro (trigger mm_verificar_entidad).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nifError, normalizeNif } from "@/lib/nif";

export type EntityState = { ok?: string; error?: string };

export async function saveEntity(_prev: EntityState, form: FormData): Promise<EntityState> {
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const nif = normalizeNif(String(form.get("nif") ?? ""));
  if (nombre.length < 2 || nombre.length > 120 || /[<>]/.test(nombre)) return { error: "Escribe el nombre de la entidad (entre 2 y 120 caracteres)." };
  const err = nifError(nif);
  if (err) return { error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/entidad");

  const { data: existing } = await supabase.from("mm_entidades").select("id").eq("usuario", user.id).maybeSingle();
  const { data, error } = existing
    ? await supabase.from("mm_entidades").update({ nombre, nif }).eq("id", existing.id).select("verificada").single()
    : await supabase.from("mm_entidades").insert({ nombre, nif }).select("verificada").single();
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };

  revalidatePath("/entidad");
  return { ok: data.verificada ? "Guardado. Tu entidad está verificada." : "Guardado. Este NIF no está en el Registro: tus planes quedarán pendientes de revisión." };
}
