"use server";

// Acciones de ubicación: "usar dónde estoy ahora", "volver a usar mi casa",
// "guardar como mi casa" y "cambiar mi código postal".
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { HERE_COOKIE, HERE_MAX_AGE, isPostalCode, parsePoint } from "@/lib/location";
import { postalCodeLocation } from "@/lib/postalCodes";
import { getZones, ZONE_COOKIE, ZONE_MAX_AGE, zoneCookieValue } from "@/lib/zones";

export type LocationState = { error?: string; ok?: string };

const refresh = () => revalidatePath("/", "layout");

// Dónde estoy ahora: solo en una cookie de este móvil (no se guarda en la base de datos)
export async function setHereLocation(form: FormData): Promise<LocationState> {
  const p = parsePoint(`${form.get("lat")},${form.get("lon")}`);
  if (!p) return { error: "Esa ubicación no está en la Comunidad de Madrid." };
  (await cookies()).set(HERE_COOKIE, `${p.lat},${p.lon}`, { path: "/", maxAge: HERE_MAX_AGE, sameSite: "lax" });
  refresh();
  return { ok: "Ahora las distancias se cuentan desde donde estás." };
}

export async function clearHereLocation(): Promise<LocationState> {
  (await cookies()).delete(HERE_COOKIE);
  refresh();
  return {};
}

// Guarda un punto (o el de "dónde estoy ahora") como casa en el perfil
export async function saveHomeHere(form: FormData): Promise<LocationState> {
  const p = parsePoint(`${form.get("lat")},${form.get("lon")}`);
  if (!p) return { error: "Esa ubicación no está en la Comunidad de Madrid." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Para guardar tu casa necesitas una cuenta." };
  const { error } = await supabase.from("mm_perfiles").update({ lat: p.lat, lon: p.lon }).eq("id", user.id);
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };
  (await cookies()).delete(HERE_COOKIE);
  refresh();
  return { ok: "Hemos guardado este sitio como tu casa." };
}

// Código postal → casa (con cuenta) o punto de partida temporal (sin cuenta)
export async function savePostalCode(_prev: LocationState, form: FormData): Promise<LocationState> {
  const cp = String(form.get("codigo_postal") ?? "").trim();
  if (!isPostalCode(cp)) return { error: "Escribe un código postal de 5 cifras que empiece por 28." };
  const place = postalCodeLocation(cp);
  if (!place) return { error: "No conocemos ese código postal. Revisa que esté bien escrito." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const store = await cookies();
  if (!user) {
    store.set(HERE_COOKIE, `${place.lat},${place.lon},${cp}`, { path: "/", maxAge: HERE_MAX_AGE, sameSite: "lax" });
    refresh();
    return { ok: `Contamos las distancias desde el código postal ${cp} (${place.municipio}).` };
  }
  const { error } = await supabase
    .from("mm_perfiles")
    .update({ lat: place.lat, lon: place.lon, municipio: place.municipio })
    .eq("id", user.id);
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };
  store.delete(HERE_COOKIE);
  refresh();
  return { ok: `Hemos guardado tu casa en el código postal ${cp} (${place.municipio}).` };
}

// "Ver planes en otra zona" (versión por defecto): distrito de Madrid o municipio.
// Solo una cookie de este móvil durante 3 horas; no cambia la casa del perfil.
export async function setZone(_prev: LocationState, form: FormData): Promise<LocationState> {
  const name = String(form.get("zona") ?? "").trim().toLowerCase();
  if (!name) return { error: "Escribe un distrito de Madrid o un municipio." };
  const zones = await getZones();
  const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Vale "Arganzuela" o "Madrid · Arganzuela", con o sin tildes
  const zone = zones.find((z) => plain(z.name) === plain(name) || plain(z.name) === `madrid · ${plain(name)}`);
  if (!zone) return { error: "No encontramos esa zona. Elige un distrito o municipio de la lista." };
  (await cookies()).set(ZONE_COOKIE, zoneCookieValue(zone), { path: "/", maxAge: ZONE_MAX_AGE, sameSite: "lax" });
  refresh();
  return { ok: `Ahora ves planes en ${zone.name}.` };
}

export async function clearZone(): Promise<LocationState> {
  (await cookies()).delete(ZONE_COOKIE);
  refresh();
  return {};
}
