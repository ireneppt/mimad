// Utilidades comunes del script de carga de datos abiertos.
import { createHash } from "node:crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import proj4 from "proj4";

// Algunos portales devuelven una página HTML si la petición no parece de un navegador
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MiMad-ingest/0.1; +https://github.com/ireneppt/mimad)",
  Accept: "application/json, text/plain, */*",
};

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  return res.text();
}

export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const text = await fetchText(url);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`La respuesta no es JSON (empieza por: ${text.slice(0, 80).replace(/\s+/g, " ")})`);
  }
}

// ArcGIS (sigma.madrid.es): máximo ~2.000 filas por petición → paginar
type ArcgisResponse = {
  features: { attributes: Record<string, unknown>; geometry?: { x: number; y: number } }[];
  exceededTransferLimit?: boolean;
  error?: { message: string };
};

export async function fetchArcgisAll(baseQueryUrl: string, pageSize = 1000) {
  const all: ArcgisResponse["features"] = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = `${baseQueryUrl}&resultOffset=${offset}&resultRecordCount=${pageSize}`;
    const page = await fetchJson<ArcgisResponse>(url);
    if (page.error) throw new Error(`ArcGIS: ${page.error.message}`);
    all.push(...page.features);
    if (!page.exceededTransferLimit || page.features.length === 0) break;
  }
  return all;
}

// Coordenadas UTM ETRS89 zona 30N (EPSG:25830) → lat/lon (WGS84)
proj4.defs("EPSG:25830", "+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

export function utmToLatLon(x: string | number | null | undefined, y: string | number | null | undefined) {
  const nx = Number(String(x ?? "").replace(",", "."));
  const ny = Number(String(y ?? "").replace(",", "."));
  if (!nx || !ny) return { lat: null, lon: null };
  const [lon, lat] = proj4("EPSG:25830", "EPSG:4326", [nx, ny]);
  // Fuera de la Comunidad de Madrid → coordenada errónea
  if (lat < 39.8 || lat > 41.2 || lon < -4.6 || lon > -3.0) return { lat: null, lon: null };
  return { lat, lon };
}

// Texto limpio: sin espacios sobrantes; cadenas vacías → null
export function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function hashId(...parts: unknown[]): string {
  return createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

// Guarda las filas en la tabla: upsert por clave y borra las que ya no
// vienen en la fuente. Así la tabla nunca se queda vacía a medias.
export async function replaceTable(
  db: SupabaseClient,
  table: string,
  key: string,
  rows: Record<string, unknown>[],
  loadedAt: string
) {
  if (rows.length === 0) throw new Error("La fuente no ha devuelto filas: no se toca la tabla");

  const stamped = rows.map((r) => ({ ...r, fecha_carga: loadedAt }));
  for (let i = 0; i < stamped.length; i += 500) {
    const { error } = await db.from(table).upsert(stamped.slice(i, i + 500), { onConflict: key });
    if (error) throw new Error(`Error guardando en ${table}: ${error.message}`);
  }

  const { error } = await db.from(table).delete().lt("fecha_carga", loadedAt);
  if (error) throw new Error(`Error borrando filas antiguas de ${table}: ${error.message}`);
}
