"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Solo se vuelve a pantallas de la versión simplificada (evita redirecciones a otras webs)
function safeBack(form: FormData): string {
  const back = String(form.get("back") ?? "");
  return back.startsWith("/simple/") && !back.startsWith("//") ? back : "/simple/planes";
}

// Añade o quita un parámetro de la dirección de vuelta
function withParam(path: string, key: string, value: string | null): string {
  const url = new URL(path, "http://x");
  url.searchParams.delete("hecho");
  url.searchParams.delete("quitado");
  if (value) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

// "Me apunto" desde la versión simplificada (misma tabla que la versión por defecto)
export async function joinPlan(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const back = safeBack(form);
  if (!eventoId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Invitada: para apuntarse hace falta cuenta
  if (!user) redirect(`/simple/login?next=${encodeURIComponent(back)}`);

  const { error } = await supabase.from("mm_inscripciones").insert({ evento_id: eventoId });
  // 23505 = ya estaba apuntada: no es un error para la persona
  if (error && error.code !== "23505") throw new Error(`No se pudo apuntar: ${error.message}`);

  // Si era un plan recomendado por un familiar, la recomendación queda aceptada
  await supabase
    .from("mm_recomendaciones")
    .update({ estado: "aceptada" })
    .eq("para", user.id)
    .eq("evento_id", eventoId)
    .eq("estado", "pendiente");

  revalidatePath("/simple");
  // El plan puede cambiar de sitio en la lista (p. ej. si era recomendado): se confirma arriba por su id
  redirect(withParam(back, "hecho", eventoId));
}

// "Ya no puedo ir": borra la inscripción
export async function leavePlan(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const back = safeBack(form);
  if (!eventoId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/simple/login?next=${encodeURIComponent(back)}`);

  const { error } = await supabase.from("mm_inscripciones").delete().eq("usuario", user.id).eq("evento_id", eventoId);
  if (error) throw new Error(`No se pudo quitar el plan: ${error.message}`);

  revalidatePath("/simple");
  redirect(withParam(back, "quitado", "1"));
}
