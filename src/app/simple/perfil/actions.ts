"use server";

// Cambios del perfil desde "Mi cuenta" (versión simplificada). Cada persona solo puede
// cambiar su propio perfil: lo garantizan las reglas de seguridad (RLS) de mm_perfiles.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { INTERESTS } from "@/lib/interests";
import { HERE_COOKIE, isPostalCode, parsePoint } from "@/lib/location";
import { postalCodeLocation } from "@/lib/postalCodes";

export type ProfileState = { error?: string };

const DONE = (campo: string) => `/simple/perfil?hecho=${campo}`;

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/simple/login?next=/simple/perfil");
  return { supabase, user };
}

async function update(fields: Record<string, unknown>, campo: string): Promise<ProfileState> {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("mm_perfiles").update(fields).eq("id", user.id);
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };
  revalidatePath("/", "layout");
  redirect(DONE(campo));
}

export async function updateName(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const nombre = String(form.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribe tu nombre." };
  if (nombre.length > 60) return { error: "El nombre es demasiado largo." };
  return update({ nombre }, "nombre");
}

// Dónde vivo: ubicación del móvil ("estoy en casa") > código postal > centro del municipio
export async function updateHome(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const municipio = String(form.get("municipio") ?? "").trim();
  const cp = String(form.get("codigo_postal") ?? "").trim();
  const here = parsePoint(`${form.get("lat")},${form.get("lon")}`);
  if (cp && !isPostalCode(cp)) return { error: "El código postal tiene 5 cifras y empieza por 28 (por ejemplo, 28012)." };
  const postal = cp ? postalCodeLocation(cp) : null;
  if (cp && !postal) return { error: "No conocemos ese código postal. Revisa que esté bien escrito." };
  if (!municipio && !postal && !here) return { error: "Elige tu municipio." };

  const { supabase } = await currentUser();
  const fields: Record<string, unknown> = {};
  if (municipio) {
    const { data: m } = await supabase.from("v_municipios").select("nombre, lat, lon").ilike("nombre", municipio).maybeSingle();
    if (!m) return { error: "No encontramos ese municipio. Elígelo de la lista." };
    Object.assign(fields, { municipio: m.nombre, lat: m.lat, lon: m.lon });
  }
  if (postal) Object.assign(fields, { lat: postal.lat, lon: postal.lon, municipio: municipio ? fields.municipio : postal.municipio });
  if (here) Object.assign(fields, { lat: here.lat, lon: here.lon });
  // La casa ha cambiado: deja de usar "dónde estoy ahora"
  (await cookies()).delete(HERE_COOKIE);
  return update(fields, "casa");
}

export async function updateInterests(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const valid = INTERESTS.map((i) => i.id);
  const intereses = form.getAll("intereses").map(String).filter((i) => valid.includes(i));
  return update({ intereses }, "gustos");
}

export async function updatePassword(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} letras o números.` };
  if (password !== String(form.get("password2") ?? "")) return { error: "Las dos contraseñas no son iguales." };
  const { supabase } = await currentUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: /different from the old/i.test(error.message) ? "Esa es la contraseña que ya tienes. Elige otra." : "No se ha podido cambiar. Prueba otra vez." };
  }
  redirect(DONE("contrasena"));
}

export async function setWhatsapp(form: FormData) {
  await update({ avisos_whatsapp: form.get("avisos") === "si" }, "avisos");
}

// Cambia a la versión por defecto y lo recuerda en el perfil
export async function switchToDefault() {
  const { supabase, user } = await currentUser();
  await supabase.from("mm_perfiles").update({ simplificada: false }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutSimple() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/simple/login");
}
