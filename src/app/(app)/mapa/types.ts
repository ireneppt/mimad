// Punto del mapa: un plan (de v_eventos) o un lugar (de v_lugares), ya preparado en el servidor
export type MapPoint = {
  id: string;
  kind: "evento" | "lugar";
  title: string;
  category: string | null; // categoría original (para elegir el icono)
  label: string; // categoría legible
  lat: number;
  lon: number;
  km: string | null; // "2,4 km" desde la ubicación de la persona
  address: string | null;
  source: string; // id de da_fuentes (el nombre va aparte, una sola vez: ver MapSource)
  // Solo planes
  image?: string | null;
  when?: string;
  free?: boolean;
  accessible?: boolean;
  // Solo lugares
  schedule?: string | null;
  phone?: string | null;
  web?: string | null;
};

// Fuentes de los puntos, enviadas una sola vez (no repetidas en cada punto)
export type MapSource = { label: string; url: string | null };
