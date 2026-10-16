// Ubicación de la persona: utilidades que sirven en el servidor y en el navegador.

export type Point = { lat: number; lon: number };

// Cookie con "dónde estoy ahora" (solo en este móvil, nunca en la base de datos)
export const HERE_COOKIE = "mm_aqui";
export const HERE_MAX_AGE = 60 * 60 * 3; // 3 horas: luego vuelve a usar la casa

// Por privacidad se guarda redondeado a 3 decimales (unos 100 metros)
export const roundCoord = (x: number) => Math.round(x * 1000) / 1000;

// Caja que contiene la Comunidad de Madrid (con un poco de margen)
export function isInComunidad({ lat, lon }: Point): boolean {
  return lat > 39.85 && lat < 41.2 && lon > -4.6 && lon < -3.0;
}

// Código postal de la Comunidad de Madrid: 5 cifras que empiezan por 28
export const isPostalCode = (s: string) => /^28\d{3}$/.test(s.trim());

// Valor de la cookie "dónde estoy": "40.412,-3.702" (ubicación del móvil) o
// "40.412,-3.702,28012" (código postal que ha escrito una persona sin cuenta)
export function parseHere(s: string | undefined | null): { point: Point; cp: string | null } | null {
  const [lat, lon, cp] = (s ?? "").split(",");
  const point = parsePoint(`${lat},${lon}`);
  return point ? { point, cp: cp && isPostalCode(cp) ? cp : null } : null;
}

// "40.412,-3.702" → { lat, lon } (o null si no es válido o está fuera de la Comunidad)
export function parsePoint(s: string | undefined | null): Point | null {
  const [lat, lon] = (s ?? "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const p = { lat: roundCoord(lat), lon: roundCoord(lon) };
  return isInComunidad(p) ? p : null;
}
