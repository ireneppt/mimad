"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvent } from "@/lib/data";
import { findConflict } from "@/lib/simpleAgenda";

// Solo se vuelve a pantallas de la versión simplificada (evita redirecciones a otras webs)
function safeBack(form: FormData): string {
  const back = String(form.get("back") ?? "");
  return back.startsWith("/simple/") && !back.startsWith("//") ? back : "/simple/planes";
}

// Dirección de vuelta con sus avisos (quita los avisos anteriores)
function withParams(path: string, params: Record<string, string>): string {
  const url = new URL(path, "http://x");
  for (const k of ["hecho", "quitado", "choque", "con"]) url.searchParams.delete(k);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return `${url.pathname}${url.search}${url.hash}`;
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

  // ¿Coincide con otro plan suyo el mismo día a la misma hora? Entonces se le pregunta qué prefiere
  // ("forzar" = ha elegido "Apuntarme a los dos igualmente")
  if (form.get("forzar") !== "1") {
    const evento = await getEvent(supabase, eventoId);
    const conflict = evento ? await findConflict(supabase, user.id, evento) : null;
    if (conflict) redirect(withParams(back, { choque: eventoId, con: conflict.id }));
  }

  await join(supabase, user.id, eventoId);
  revalidatePath("/simple");
  // El plan puede cambiar de sitio en la lista (p. ej. si era recomendado): se confirma arriba por su id
  redirect(withParams(back, { hecho: eventoId }));
}

// "Cambiar a este plan": deja el que coincidía y se apunta al nuevo
export async function swapPlan(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const quitarId = String(form.get("quitar_id") ?? "");
  const back = safeBack(form);
  if (!eventoId || !quitarId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/simple/login?next=${encodeURIComponent(back)}`);

  const { error } = await supabase.from("mm_inscripciones").delete().eq("usuario", user.id).eq("evento_id", quitarId);
  if (error) throw new Error(`No se pudo quitar el otro plan: ${error.message}`);
  await join(supabase, user.id, eventoId);
  revalidatePath("/simple");
  redirect(withParams(back, { hecho: eventoId }));
}

async function join(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, eventoId: string) {
  const { error } = await supabase.from("mm_inscripciones").insert({ evento_id: eventoId });
  // 23505 = ya estaba apuntada: no es un error para la persona
  if (error && error.code !== "23505") throw new Error(`No se pudo apuntar: ${error.message}`);

  // Si era un plan recomendado por un familiar, la recomendación queda aceptada
  await supabase
    .from("mm_recomendaciones")
    .update({ estado: "aceptada" })
    .eq("para", userId)
    .eq("evento_id", eventoId)
    .eq("estado", "pendiente");
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
  redirect(withParams(back, { quitado: "1" }));
}
