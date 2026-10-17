// "Ver planes en otra zona": un distrito de Madrid o un municipio de la Comunidad.
// Se guarda solo en una cookie de este móvil durante 3 horas (no cambia la casa del perfil).
import { unstable_cache } from "next/cache";
import { isInComunidad, roundCoord, type Point } from "./location";
import { createPublicClient } from "./supabase/public";

export const ZONE_COOKIE = "mm_zona";
export const ZONE_MAX_AGE = 60 * 60 * 3;

export type Zone = Point & { name: string };

// Valor de la cookie: "40.389|-3.688|Madrid · Arganzuela"
export function parseZone(s: string | undefined | null): Zone | null {
  const [lat, lon, ...name] = (s ?? "").split("|");
  const p = { lat: Number(lat), lon: Number(lon) };
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || !isInComunidad(p) || !name.length) return null;
  return { lat: roundCoord(p.lat), lon: roundCoord(p.lon), name: name.join("|").slice(0, 80) };
}

export const zoneCookieValue = (z: Zone) => `${roundCoord(z.lat)}|${roundCoord(z.lon)}|${z.name}`;

// Los 21 distritos oficiales de Madrid: los datos escriben a veces el mismo de varias formas
// ("Chamartin" / "Chamartín", "San Blas" / "San Blas-Canillejas"); se juntan en su nombre oficial
const DISTRICTS = [
  "Centro", "Arganzuela", "Retiro", "Salamanca", "Chamartín", "Tetuán", "Chamberí", "Fuencarral-El Pardo", "Moncloa-Aravaca",
  "Latina", "Carabanchel", "Usera", "Puente de Vallecas", "Moratalaz", "Ciudad Lineal", "Hortaleza", "Villaverde",
  "Villa de Vallecas", "Vicálvaro", "San Blas-Canillejas", "Barajas",
];
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
function officialDistrict(raw: string): string | undefined {
  const p = plain(raw);
  return DISTRICTS.find((d) => plain(d) === p) ?? DISTRICTS.find((d) => plain(d).startsWith(p) || p.startsWith(plain(d)));
}

// Zonas que se pueden elegir: los distritos de Madrid (centro de sus sitios en v_lugares)
// y los municipios de la Comunidad (v_municipios). Todo sale de los datos abiertos.
// Es igual para todo el mundo y casi no cambia: se guarda en memoria una hora.
export const getZones = unstable_cache(loadZones, ["zonas"], { revalidate: 3600 });

async function loadZones(): Promise<Zone[]> {
  const db = createPublicClient();
  const [{ data: lugares }, { data: municipios }] = await Promise.all([
    db.from("v_lugares").select("distrito, lat, lon").ilike("municipio", "madrid").not("distrito", "is", null).limit(1000),
    db.from("v_municipios").select("nombre, lat, lon").order("nombre"),
  ]);

  const byDistrict = new Map<string, { lat: number; lon: number; n: number }>();
  for (const l of lugares ?? []) {
    const d = officialDistrict(String(l.distrito));
    if (!d) continue;
    const acc = byDistrict.get(d) ?? { lat: 0, lon: 0, n: 0 };
    acc.lat += l.lat;
    acc.lon += l.lon;
    acc.n += 1;
    byDistrict.set(d, acc);
  }
  const districts = [...byDistrict.entries()]
    .map(([d, a]) => ({ name: `Madrid · ${d}`, lat: a.lat / a.n, lon: a.lon / a.n }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const towns = (municipios ?? [])
    .filter((m) => String(m.nombre).toLowerCase() !== "madrid" && m.lat != null && m.lon != null)
    .map((m) => ({ name: String(m.nombre), lat: m.lat as number, lon: m.lon as number }));

  return [...districts, ...towns];
}
