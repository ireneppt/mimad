// Perfil de la persona con sesión (o null si es invitada / no ha entrado)
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase/server";

export type Perfil = {
  id: string;
  nombre: string;
  tipo: "persona" | "entidad";
  simplificada: boolean;
  telefono: string | null;
  barrio: string | null;
  municipio: string | null;
  lat: number | null;
  lon: number | null;
  intereses: string[];
  email_contacto: string | null;
  avisos_whatsapp: boolean;
  avisos_app: boolean;
  foto_url: string | null;
};

// Se lee una sola vez por página aunque lo pidan varios componentes
const loadProfile = cache(async (db: SupabaseClient, id: string): Promise<Perfil | null> => {
  const { data } = await db.from("mm_perfiles").select("*").eq("id", id).maybeSingle();
  return (data as Perfil) ?? null;
});

export async function getCurrentProfile(db: SupabaseClient): Promise<Perfil | null> {
  const user = await getAuthUser();
  return user ? loadProfile(db, user.id) : null;
}

// Punto de referencia para "cerca de mí": casa del perfil o, si no hay, la Puerta del Sol
export const MADRID_CENTER = { lat: 40.4168, lon: -3.7038 };

export function homeLocation(p: Perfil | null) {
  return p?.lat != null && p?.lon != null ? { lat: p.lat, lon: p.lon } : MADRID_CENTER;
}
