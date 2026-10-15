// Perfil de la persona con sesión (o null si es invitada / no ha entrado)
import type { SupabaseClient } from "@supabase/supabase-js";

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
};

export async function getCurrentProfile(db: SupabaseClient): Promise<Perfil | null> {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("mm_perfiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Perfil) ?? null;
}

// Punto de referencia para "cerca de mí": casa del perfil o, si no hay, la Puerta del Sol
export const MADRID_CENTER = { lat: 40.4168, lon: -3.7038 };

export function homeLocation(p: Perfil | null) {
  return p?.lat != null && p?.lon != null ? { lat: p.lat, lon: p.lon } : MADRID_CENTER;
}
