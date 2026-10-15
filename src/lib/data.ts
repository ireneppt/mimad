// Lectura de los datos abiertos unificados (v_eventos, v_lugares, da_fuentes).
// Funciona en servidor y en navegador: se le pasa el cliente de Supabase.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Evento = {
  id: string; // "<fuente>:<id original>"
  fuente: string;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  fecha_inicio: string | null; // hora local de Madrid, sin zona
  fecha_fin: string | null;
  horario: string | null;
  recurrente: boolean;
  lugar: string | null;
  direccion: string | null;
  municipio: string | null;
  distrito: string | null;
  lat: number | null;
  lon: number | null;
  url: string | null;
  gratuito: boolean | null;
  precio: string | null;
  accesibilidad: string | null;
  publico: string | null;
  idioma: string | null;
};

export type Lugar = {
  id: string;
  fuente: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  direccion: string | null;
  municipio: string | null;
  distrito: string | null;
  lat: number;
  lon: number;
  telefono: string | null;
  email: string | null;
  url: string | null;
  horario: string | null;
  accesibilidad: string | null;
  publico: string | null;
};

export type Fuente = {
  id: string;
  nombre: string;
  organismo: string;
  url_ficha: string;
  ultima_carga: string | null;
};

export type EventFilters = {
  search?: string;
  free?: boolean;
  accessible?: boolean;
  categories?: string[];
  sources?: string[];
  language?: string;
  near?: { lat: number; lon: number; km: number };
  limit?: number;
};

// Códigos de accesibilidad de la instalación (datos.madrid.es, "Estructura DS eventos"):
// https://datos.madrid.es/FWProjects/egob/Catalogo/XComun/Ficheros/Estructura_DS_eventos_wwwmadrid.pdf
export const ACCESSIBILITY_LABELS: Record<string, string> = {
  "0": "Instalación no accesible",
  "1": "Instalación accesible",
  "2": "Parcialmente accesible para movilidad reducida",
  "3": "Sin información de accesibilidad",
  "4": "Lengua de signos",
  "5": "Señalización podotáctil",
  "6": "Bucle magnético para audífonos",
};

const accessibilityCodes = (e: Pick<Evento, "accesibilidad">) =>
  (e.accesibilidad ?? "").split(",").map((c) => c.trim()).filter(Boolean);

// "Accesible" = la instalación es accesible (código 1)
export function isAccessible(e: Pick<Evento, "accesibilidad">): boolean {
  return accessibilityCodes(e).includes("1");
}

export function accessibilityLabels(e: Pick<Evento, "accesibilidad">): string[] {
  return accessibilityCodes(e).map((c) => ACCESSIBILITY_LABELS[c]).filter(Boolean);
}

export async function getEvents(db: SupabaseClient, f: EventFilters = {}): Promise<Evento[]> {
  let q = db.from("v_eventos").select("*");
  if (f.search) q = q.ilike("titulo", `%${f.search}%`);
  if (f.free) q = q.eq("gratuito", true);
  if (f.accessible) q = q.filter("accesibilidad", "match", "(^|,)1(,|$)"); // contiene el código 1
  if (f.categories?.length) q = q.in("categoria", f.categories);
  if (f.sources?.length) q = q.in("fuente", f.sources);
  if (f.language) q = q.eq("idioma", f.language);
  if (f.near) {
    // Caja aproximada alrededor del punto (1º de latitud ≈ 111 km)
    const dLat = f.near.km / 111;
    const dLon = f.near.km / (111 * Math.cos((f.near.lat * Math.PI) / 180));
    q = q
      .gte("lat", f.near.lat - dLat).lte("lat", f.near.lat + dLat)
      .gte("lon", f.near.lon - dLon).lte("lon", f.near.lon + dLon);
  }
  // Primero los que empiezan antes; los recurrentes (sin fecha) al final
  q = q.order("fecha_inicio", { ascending: true, nullsFirst: false }).limit(f.limit ?? 50);

  const { data, error } = await q;
  if (error) throw new Error(`No se pudieron cargar los eventos: ${error.message}`);
  return (data ?? []) as Evento[];
}

export async function getEvent(db: SupabaseClient, id: string): Promise<Evento | null> {
  const { data, error } = await db.from("v_eventos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el evento: ${error.message}`);
  return data as Evento | null;
}

export async function getEventsByIds(db: SupabaseClient, ids: string[]): Promise<Evento[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("v_eventos").select("*").in("id", ids);
  if (error) throw new Error(`No se pudieron cargar los eventos: ${error.message}`);
  return (data ?? []) as Evento[];
}

export async function getPlaces(db: SupabaseClient, categories?: string[]): Promise<Lugar[]> {
  let q = db.from("v_lugares").select("*");
  if (categories?.length) q = q.in("categoria", categories);
  const { data, error } = await q.limit(1000);
  if (error) throw new Error(`No se pudieron cargar los lugares: ${error.message}`);
  return (data ?? []) as Lugar[];
}

export async function getSources(db: SupabaseClient): Promise<Record<string, Fuente>> {
  const { data, error } = await db.from("da_fuentes").select("id, nombre, organismo, url_ficha, ultima_carga");
  if (error) throw new Error(`No se pudieron cargar las fuentes: ${error.message}`);
  return Object.fromEntries((data ?? []).map((f) => [f.id, f as Fuente]));
}

// Distancia en km entre dos puntos (fórmula del haversine)
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
