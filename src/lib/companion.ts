// Acompañamiento: un familiar (Lucía) acompaña a una persona (Carmen) con un vínculo
// aceptado (mm_vinculos). Las reglas de seguridad de la base de datos deciden qué ve
// cada uno: el familiar solo ve el perfil, la agenda y las recomendaciones de su persona
// si el vínculo está aceptado.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEventsByIds } from "./data";
import { getMyAgenda, type AgendaItem } from "./simpleAgenda";

export type Persona = {
  id: string;
  nombre: string;
  municipio: string | null;
  telefono: string | null;
  lat: number | null;
  lon: number | null;
  intereses: string[];
};

export type Novedad = { tipo: "apuntada" | "recomendada" | "descartada"; texto: string; titulo: string; fecha: string };

export type Acompanada = {
  vinculoId: string;
  persona: Persona;
  proximo: AgendaItem | null;
  novedades: Novedad[];
};

export type Invitacion = { id: string; codigo: string; expira_at: string };

// "ABCDEF" → "ABC-DEF" (más fácil de leer y dictar por teléfono)
export const formatCode = (c: string) => (c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);

// Personas a las que acompaño (vínculo aceptado) e invitaciones que aún nadie ha aceptado
export async function getAccompanied(db: SupabaseClient, userId: string): Promise<{ activas: Acompanada[]; pendientes: Invitacion[] }> {
  const { data: vinculos } = await db
    .from("mm_vinculos")
    .select("id, persona, codigo, estado, expira_at")
    .eq("familiar", userId)
    .order("created_at", { ascending: true });

  const pendientes = (vinculos ?? [])
    .filter((v) => v.estado === "pendiente" && new Date(v.expira_at) > new Date())
    .map((v) => ({ id: v.id as string, codigo: v.codigo as string, expira_at: v.expira_at as string }));
  const aceptados = (vinculos ?? []).filter((v) => v.estado === "aceptado" && v.persona);
  if (aceptados.length === 0) return { activas: [], pendientes };

  const { data: perfiles } = await db
    .from("mm_perfiles")
    .select("id, nombre, municipio, telefono, lat, lon, intereses")
    .in("id", aceptados.map((v) => v.persona as string));

  const activas = await Promise.all(
    aceptados.map(async (v): Promise<Acompanada | null> => {
      const persona = (perfiles ?? []).find((p) => p.id === v.persona) as Persona | undefined;
      if (!persona) return null;
      const [agenda, novedades] = await Promise.all([getMyAgenda(db, persona.id), getNews(db, userId, persona)]);
      return { vinculoId: v.id as string, persona, proximo: agenda[0] ?? null, novedades };
    })
  );
  return { activas: activas.filter((a): a is Acompanada => a !== null), pendientes };
}

// Últimas novedades: recomendaciones que le he hecho (y qué ha pasado) y planes a los que se ha apuntado
async function getNews(db: SupabaseClient, userId: string, persona: Persona): Promise<Novedad[]> {
  const [{ data: recs }, { data: inscripciones }] = await Promise.all([
    db.from("mm_recomendaciones").select("evento_id, estado, created_at").eq("de", userId).eq("para", persona.id).order("created_at", { ascending: false }).limit(10),
    db.from("mm_inscripciones").select("evento_id, created_at").eq("usuario", persona.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const ids = [...new Set([...(recs ?? []), ...(inscripciones ?? [])].map((r) => r.evento_id as string))];
  const eventos = await getEventsByIds(db, ids);
  const titulo = (id: string) => eventos.find((e) => e.id === id)?.titulo ?? "un plan que ya ha terminado";
  const recIds = new Set((recs ?? []).map((r) => r.evento_id));

  const news: Novedad[] = [
    ...(recs ?? []).map((r): Novedad => {
      const t = titulo(r.evento_id);
      if (r.estado === "aceptada") return { tipo: "apuntada", texto: `${persona.nombre} se ha apuntado a «${t}», que le recomendaste.`, titulo: t, fecha: r.created_at };
      if (r.estado === "descartada") return { tipo: "descartada", texto: `A ${persona.nombre} no le viene bien «${t}».`, titulo: t, fecha: r.created_at };
      return { tipo: "recomendada", texto: `Le recomendaste «${t}». Aún no ha respondido.`, titulo: t, fecha: r.created_at };
    }),
    // Planes a los que se ha apuntado por su cuenta
    ...(inscripciones ?? [])
      .filter((i) => !recIds.has(i.evento_id))
      .map((i): Novedad => ({ tipo: "apuntada", texto: `${persona.nombre} se ha apuntado a «${titulo(i.evento_id)}».`, titulo: titulo(i.evento_id), fecha: i.created_at })),
  ];
  return news.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4);
}

// La persona a la que acompaño (o null si no hay vínculo aceptado con ella)
export async function getAccompaniedPerson(db: SupabaseClient, userId: string, personaId: string): Promise<Persona | null> {
  const { data: v } = await db
    .from("mm_vinculos")
    .select("id")
    .eq("familiar", userId)
    .eq("persona", personaId)
    .eq("estado", "aceptado")
    .maybeSingle();
  if (!v) return null;
  const { data } = await db.from("mm_perfiles").select("id, nombre, municipio, telefono, lat, lon, intereses").eq("id", personaId).maybeSingle();
  return (data as Persona) ?? null;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// "Hace 5 minutos", "Hace 2 horas", "Ayer", "El lunes", "El 3 de octubre"
export function timeAgo(iso: string): string {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60_000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} ${mins === 1 ? "minuto" : "minutos"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Ayer";
  const madrid = new Date(then.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  if (days < 7) return `El ${WEEKDAYS[madrid.getDay()]}`;
  return madrid.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

// Días que le quedan a una invitación
export function daysLeft(expira: string): number {
  return Math.max(1, Math.ceil((new Date(expira).getTime() - Date.now()) / 86_400_000));
}
