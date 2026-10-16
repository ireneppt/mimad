import "server-only";

// Dirección → coordenadas con Nominatim (OpenStreetMap), sin claves. Solo para los planes
// que publican las entidades. Se limita a la Comunidad de Madrid. Política de uso de
// Nominatim: identificarse (User-Agent) y no hacer más de una petición por segundo.
import { isInComunidad, type Point } from "./location";

export async function geocode(direccion: string, municipio: string): Promise<Point | null> {
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    countrycodes: "es",
    q: `${direccion}, ${municipio || "Madrid"}, Comunidad de Madrid`,
    viewbox: "-4.6,41.2,-3.0,39.85", // caja de la Comunidad de Madrid
    bounded: "1",
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "MiMad/0.1 (prototipo DataMad 2026; https://github.com/ireneppt/mimad)", "Accept-Language": "es" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    if (!hit) return null;
    const p = { lat: Number(hit.lat), lon: Number(hit.lon) };
    return isInComunidad(p) ? p : null;
  } catch {
    return null;
  }
}
