"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invalidMobileMessage, parseMobile } from "@/lib/phone";
import { emailError, LIMITS, nameError, passwordError, strongPasswordError } from "@/lib/limits";
import { INTERESTS } from "@/lib/interests";
import { GUEST_COOKIE } from "@/lib/supabase/middleware";
import { isPostalCode, parsePoint } from "@/lib/location";
import { postalCodeLocation } from "@/lib/postalCodes";

// field: campo con el error (el registro simplificado vuelve al paso de ese campo)
export type AuthState = { error?: string; field?: string; fields?: Record<string, string> };

// Solo se permite volver a rutas internas (evita redirecciones a otras webs)
function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

async function clearGuest() {
  (await cookies()).delete(GUEST_COOKIE);
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const phone = String(form.get("telefono") ?? "");
  const country = String(form.get("pais") ?? ""); // sin país (versión simplificada) = España
  const password = String(form.get("password") ?? "").slice(0, LIMITS.passwordMax);
  const fields = { telefono: phone.slice(0, LIMITS.phoneMax), pais: country };

  const mobile = parseMobile(phone, country);
  if (!mobile) {
    return { error: invalidMobileMessage(country), fields };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: mobile.email, password });
  if (error) {
    return { error: "El móvil o la contraseña no son correctos.", fields };
  }

  await clearGuest();
  const { data: perfil } = await supabase.from("mm_perfiles").select("simplificada").eq("id", data.user.id).single();
  const next = safeNext(form.get("next"));
  // ?bienvenida=1 hace que el Inicio suba arriba del todo (ver components/Welcome.tsx)
  redirect(perfil?.simplificada ? "/simple" : next === "/" ? "/?bienvenida=1" : next);
}

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const fields = {
    nombre: get("nombre").replace(/\s+/g, " "),
    telefono: get("telefono").slice(0, LIMITS.phoneMax),
    pais: get("pais"),
    municipio: get("municipio"),
    codigo_postal: get("codigo_postal"),
    email: get("email"),
    intereses: form.getAll("intereses").map(String).join(","),
  };
  const password = String(form.get("password") ?? "");
  // Registro de la versión simplificada (/simple/registro): mismo proceso, otro destino
  const simple = form.get("simplificada") === "1";
  const fail = (error: string, field?: string): AuthState => ({ error, field, fields });

  const nombreError = nameError(fields.nombre);
  if (nombreError) return fail(nombreError, "nombre");
  const mobile = parseMobile(fields.telefono, fields.pais);
  if (!mobile) return fail(invalidMobileMessage(fields.pais), "telefono");
  if (fields.municipio.length > LIMITS.municipioMax) return fail("Elige tu municipio de la lista.", "municipio");
  if (simple && !fields.municipio) return fail("Elige el pueblo o ciudad donde vives.", "municipio");
  if (fields.codigo_postal && !isPostalCode(fields.codigo_postal)) {
    return fail("El código postal tiene 5 cifras y empieza por 28 (por ejemplo, 28012).", "codigo_postal");
  }
  // Versión por defecto: contraseña segura. Simplificada: solo la longitud (lo decide la persona B)
  const claveError = simple ? passwordError(password) : strongPasswordError(password);
  if (claveError) return fail(claveError, "password");
  if (password !== String(form.get("password2") ?? "")) return fail("Las dos contraseñas no coinciden.", "password");
  const correoError = emailError(fields.email);
  if (correoError) return fail(correoError, "email");
  if (form.get("privacidad") !== "on") return fail("Para crear la cuenta tienes que aceptar la política de privacidad.", "privacidad");

  const supabase = await createClient();

  // Municipio → coordenadas aproximadas (centro del municipio, de v_municipios)
  let lat: number | null = null;
  let lon: number | null = null;
  if (fields.municipio) {
    const { data: m } = await supabase.from("v_municipios").select("nombre, lat, lon").ilike("nombre", fields.municipio).maybeSingle();
    if (!m) return fail("No encontramos ese municipio. Elige uno de la lista de la Comunidad de Madrid.", "municipio");
    fields.municipio = m.nombre;
    lat = m.lat;
    lon = m.lon;
  }

  // Casa más precisa que el centro del municipio (redondeada a ~100 m por privacidad):
  // 1) ubicación del móvil si dijo "estoy en casa", 2) centro de su código postal
  const here = parsePoint(`${form.get("lat")},${form.get("lon")}`);
  const postal = fields.codigo_postal ? postalCodeLocation(fields.codigo_postal) : null;
  if (here) {
    lat = here.lat;
    lon = here.lon;
  } else if (postal) {
    lat = postal.lat;
    lon = postal.lon;
  }
  if (!fields.municipio && postal) fields.municipio = postal.municipio;

  const validInterests = INTERESTS.map((i) => i.id);
  const { error } = await supabase.auth.signUp({
    email: mobile.email,
    password,
    options: {
      // El trigger crear_perfil copia estos datos a mm_perfiles
      data: {
        nombre: fields.nombre,
        telefono: mobile.e164, // formato internacional: +34612345678
        tipo: "persona",
        simplificada: simple,
        municipio: fields.municipio || "Madrid",
        lat,
        lon,
        intereses: form.getAll("intereses").map(String).filter((i) => validInterests.includes(i)),
        email_contacto: fields.email || null,
        avisos_whatsapp: form.get("whatsapp") === "on",
      },
    },
  });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return fail("Ya hay una cuenta con este móvil. Inicia sesión.", "telefono");
    }
    return fail(`No se pudo crear la cuenta: ${error.message}`);
  }

  await clearGuest();
  redirect(simple ? "/simple/registro/listo" : "/?bienvenida=nueva");
}

export async function enterAsGuest() {
  (await cookies()).set(GUEST_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  redirect("/?bienvenida=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
