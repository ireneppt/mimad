"use server";

// Cambios del perfil de la versión por defecto. Cada acción comprueba los datos en el
// servidor (los límites coinciden con los del registro y con la base de datos).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, nameError, strongPasswordError } from "@/lib/limits";
import { INTERESTS } from "@/lib/interests";

export type ProfileState = { ok?: string; error?: string };

async function current() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");
  return { supabase, user };
}

const done = (ok: string): ProfileState => {
  revalidatePath("/", "layout");
  return { ok };
};

export async function updateName(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const err = nameError(nombre);
  if (err) return { error: err };
  const { supabase, user } = await current();
  const { error } = await supabase.from("mm_perfiles").update({ nombre }).eq("id", user.id);
  return error ? { error: "No se ha podido guardar. Prueba otra vez." } : done("Nombre guardado.");
}

// Municipio de la lista de la Comunidad: la casa pasa al centro del municipio
// (para afinar, el código postal se guarda con savePostalCode de locationActions)
export async function updateMunicipio(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const nombre = String(form.get("municipio") ?? "").trim().slice(0, LIMITS.municipioMax);
  if (!nombre) return { error: "Escribe tu municipio." };
  const { supabase, user } = await current();
  const { data: m } = await supabase.from("v_municipios").select("nombre, lat, lon").ilike("nombre", nombre).maybeSingle();
  if (!m) return { error: "No encontramos ese municipio. Elige uno de la lista de la Comunidad de Madrid." };
  const { error } = await supabase.from("mm_perfiles").update({ municipio: m.nombre, lat: m.lat, lon: m.lon, barrio: null }).eq("id", user.id);
  return error ? { error: "No se ha podido guardar. Prueba otra vez." } : done(`Municipio guardado: ${m.nombre}.`);
}

export async function updateInterests(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const valid = new Set(INTERESTS.map((i) => i.id));
  const intereses = [...new Set(form.getAll("intereses").map(String))].filter((i) => valid.has(i));
  const { supabase, user } = await current();
  const { error } = await supabase.from("mm_perfiles").update({ intereses }).eq("id", user.id);
  return error ? { error: "No se ha podido guardar. Prueba otra vez." } : done("Intereses guardados.");
}

// Cambiar la contraseña: se pide la actual para que nadie la cambie con el móvil desbloqueado
export async function changePassword(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  if (nueva !== String(form.get("nueva2") ?? "")) return { error: "Las dos contraseñas nuevas no coinciden." };
  const err = strongPasswordError(nueva);
  if (err) return { error: err };

  const { supabase, user } = await current();
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email!, password: actual });
  if (wrong) return { error: "La contraseña actual no es correcta." };
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: /different from the old/i.test(error.message) ? "La nueva contraseña tiene que ser distinta de la actual." : "No se ha podido cambiar. Prueba otra vez." };
  return { ok: "Contraseña cambiada." };
}

// Interruptores de avisos
export async function setNotices(field: "avisos_whatsapp" | "avisos_app", value: boolean): Promise<ProfileState> {
  const { supabase, user } = await current();
  const { error } = await supabase.from("mm_perfiles").update({ [field]: value }).eq("id", user.id);
  return error ? { error: "No se ha podido guardar. Prueba otra vez." } : done(value ? "Avisos activados." : "Avisos desactivados.");
}

// Aceptar el código de invitación de un familiar (mismo proceso que la versión simplificada)
export async function acceptCode(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const codigo = String(form.get("codigo") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (codigo.length !== 6) return { error: "El código tiene 6 letras y números (por ejemplo ABC-234)." };
  const { supabase } = await current();
  const { data, error } = await supabase.rpc("aceptar_vinculo", { p_codigo: codigo });
  if (error) return { error: error.message };
  const row = (data as { familiar_nombre: string | null; error: string | null }[] | null)?.[0];
  if (row?.error) return { error: row.error };
  return done(`Listo: ${row?.familiar_nombre ?? "tu familiar"} ya puede ver tu agenda y recomendarte planes.`);
}

// Dejar de compartir mi agenda con alguien que me acompaña
export async function stopSharing(form: FormData) {
  const { supabase, user } = await current();
  await supabase.from("mm_vinculos").delete().eq("id", String(form.get("id"))).eq("persona", user.id);
  revalidatePath("/", "layout");
}

// Borrar la cuenta: hay que escribir BORRAR para confirmarlo
export async function deleteAccount(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  if (String(form.get("confirmacion") ?? "").trim().toUpperCase() !== "BORRAR") {
    return { error: "Escribe BORRAR (en mayúsculas o minúsculas) para confirmar." };
  }
  const { supabase } = await current();
  const { error } = await supabase.rpc("borrar_mi_cuenta");
  if (error) return { error: "No se ha podido borrar la cuenta. Prueba otra vez." };
  await supabase.auth.signOut();
  redirect("/login?borrada=1");
}
