// "Descargar mis datos" (derecho de acceso): todo lo que MiMad guarda de la persona,
// en un archivo JSON. Solo lo suyo: las reglas de seguridad (RLS) no dejan leer más.
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Tienes que iniciar sesión", { status: 401 });

  const [perfil, inscripciones, vinculos, recomendaciones, notificaciones, entidad] = await Promise.all([
    supabase.from("mm_perfiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("mm_inscripciones").select("evento_id, created_at").eq("usuario", user.id),
    supabase.from("mm_vinculos").select("id, familiar, persona, estado, created_at, aceptado_at").or(`familiar.eq.${user.id},persona.eq.${user.id}`),
    supabase.from("mm_recomendaciones").select("de, para, evento_id, mensaje, estado, created_at").or(`de.eq.${user.id},para.eq.${user.id}`),
    supabase.from("mm_notificaciones").select("tipo, titulo, texto, evento_id, leida, created_at").eq("usuario", user.id),
    supabase.from("mm_entidades").select("nombre, nif, nombre_oficial, verificada, created_at").eq("usuario", user.id).maybeSingle(),
  ]);

  const body = {
    explicacion: "Datos que MiMad guarda de ti. Las actividades vienen de datos abiertos públicos y no se incluyen.",
    descargado: new Date().toISOString(),
    cuenta: { id: user.id, creada: user.created_at },
    perfil: perfil.data,
    inscripciones: inscripciones.data ?? [],
    vinculos_de_acompanamiento: vinculos.data ?? [],
    recomendaciones: recomendaciones.data ?? [],
    notificaciones: notificaciones.data ?? [],
    entidad: entidad.data,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mimad-mis-datos.json"`,
      "Cache-Control": "no-store",
    },
  });
}
