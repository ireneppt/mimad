// Planes que publica una entidad (tabla mm_eventos). En la app de las personas aparecen
// dentro de v_eventos con el id "entidad:<id>" (así funcionan inscripciones, mapa, agenda…).
import type { SupabaseClient } from "@supabase/supabase-js";

export type EntityEvent = {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  direccion: string | null;
  municipio: string | null;
  lat: number | null;
  lon: number | null;
  gratuito: boolean;
  precio: string | null;
  publico: string | null;
  accesible: boolean;
  plazas: number | null;
  estado: "pendiente" | "publicado" | "rechazado" | "cancelado";
  created_at: string;
};

export type EntityEventWithCount = EntityEvent & { apuntados: number };

export const publicId = (id: string) => `entidad:${id}`;

// Categorías que puede elegir una entidad (las mismas que usan los datos abiertos)
export const ENTITY_CATEGORIES: { value: string; label: string }[] = [
  { value: "CursosTalleres", label: "Taller o curso" },
  { value: "ConferenciasColoquios", label: "Charla o coloquio" },
  { value: "Musica", label: "Música" },
  { value: "DanzaBaile", label: "Baile" },
  { value: "ExcursionesItinerariosVisitas", label: "Paseo, ruta o visita" },
  { value: "ActividadesDeportivas", label: "Deporte" },
  { value: "ClubesLectura", label: "Club de lectura" },
  { value: "CapacitacionDigital", label: "Informática y móvil" },
  { value: "CineActividadesAudiovisuales", label: "Cine" },
  { value: "TeatroPerformance", label: "Teatro" },
  { value: "Exposiciones", label: "Exposición" },
  { value: "Fiestas", label: "Fiesta o encuentro" },
  { value: "Idiomas", label: "Idiomas" },
];

export const ENTITY_AUDIENCES: { value: string; label: string }[] = [
  { value: "PoblaciónGeneral", label: "Todo el mundo" },
  { value: "Mayores", label: "Personas mayores" },
  { value: "Familias", label: "Familias" },
  { value: "Jovenes", label: "Jóvenes" },
  { value: "Niños", label: "Niños y niñas" },
  { value: "Mujeres", label: "Mujeres" },
  { value: "Personas migrantes", label: "Personas migrantes" },
];

export const STATUS_LABELS: Record<EntityEvent["estado"], { label: string; cls: string }> = {
  publicado: { label: "Publicado", cls: "bg-green-50 text-green-800 ring-green-200" },
  pendiente: { label: "Pendiente de revisión", cls: "bg-amber-50 text-amber-900 ring-amber-200" },
  rechazado: { label: "Rechazado", cls: "bg-red-50 text-red-800 ring-red-200" },
  cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-700 ring-slate-300" },
};

export async function getMyEntity(db: SupabaseClient, userId: string) {
  const { data } = await db.from("mm_entidades").select("id, nombre, nif, nombre_oficial, verificada").eq("usuario", userId).maybeSingle();
  return data as { id: string; nombre: string; nif: string; nombre_oficial: string | null; verificada: boolean } | null;
}

// Planes de la entidad con cuántas personas se han apuntado (solo el número: privacidad)
export async function getEntityEvents(db: SupabaseClient, entityId: string): Promise<EntityEventWithCount[]> {
  const { data } = await db.from("mm_eventos").select("*").eq("entidad_id", entityId).order("fecha_inicio", { ascending: true });
  const events = (data ?? []) as EntityEvent[];
  const counts = await Promise.all(events.map((e) => db.rpc("contar_inscritos", { p_evento: publicId(e.id) })));
  return events.map((e, i) => ({ ...e, apuntados: typeof counts[i].data === "number" ? counts[i].data : 0 }));
}

export async function getEntityEvent(db: SupabaseClient, entityId: string, id: string): Promise<EntityEventWithCount | null> {
  const { data } = await db.from("mm_eventos").select("*").eq("entidad_id", entityId).eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: n } = await db.rpc("contar_inscritos", { p_evento: publicId(id) });
  return { ...(data as EntityEvent), apuntados: typeof n === "number" ? n : 0 };
}

// "Ya ha pasado": terminó antes de hoy
export function isPast(e: Pick<EntityEvent, "fecha_inicio" | "fecha_fin">): boolean {
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  return (e.fecha_fin ?? e.fecha_inicio).slice(0, 10) < today;
}
