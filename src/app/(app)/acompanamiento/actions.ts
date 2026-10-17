"use server";

// Acompañamiento (lado del familiar). Las reglas de seguridad de la base de datos impiden
// recomendar o ver nada de alguien sin un vínculo aceptado; aquí solo se da forma a los avisos.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CompanionState = { error?: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/acompanamiento");
  return { supabase, user };
}

// Nuevo código de invitación (la base de datos lo genera: 6 letras y números, caduca en 7 días)
export async function createInvite() {
  const { supabase } = await currentUser();
  const { data, error } = await supabase.from("mm_vinculos").insert({}).select("id").single();
  if (error) throw new Error(`No se pudo crear la invitación: ${error.message}`);
  revalidatePath("/acompanamiento");
  redirect(`/acompanamiento?nueva=${data.id}#invitacion-${data.id}`);
}

export async function cancelInvite(form: FormData) {
  const { supabase, user } = await currentUser();
  await supabase.from("mm_vinculos").delete().eq("id", String(form.get("id"))).eq("familiar", user.id).eq("estado", "pendiente");
  revalidatePath("/acompanamiento");
  redirect("/acompanamiento");
}

export async function stopAccompanying(form: FormData) {
  const { supabase, user } = await currentUser();
  await supabase.from("mm_vinculos").delete().eq("id", String(form.get("id"))).eq("familiar", user.id);
  revalidatePath("/", "layout");
  redirect("/acompanamiento?dejado=1");
}

export async function recommendPlan(_prev: CompanionState, form: FormData): Promise<CompanionState> {
  const persona = String(form.get("persona") ?? "");
  const evento = String(form.get("evento") ?? "");
  const mensaje = String(form.get("mensaje") ?? "").trim().slice(0, 500) || null;
  if (!persona || !evento) return { error: "Elige un plan." };

  const { supabase, user } = await currentUser();
  // Si ya se lo había recomendado y no ha respondido, no se repite
  const { data: ya } = await supabase
    .from("mm_recomendaciones")
    .select("id")
    .eq("de", user.id)
    .eq("para", persona)
    .eq("evento_id", evento)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!ya) {
    const { error } = await supabase.from("mm_recomendaciones").insert({ para: persona, evento_id: evento, mensaje });
    // Sin vínculo aceptado, la regla de seguridad lo rechaza
    if (error) return { error: "No se ha podido enviar. ¿Sigues acompañando a esta persona?" };
  }
  revalidatePath("/", "layout");
  // Se queda en la pantalla de recomendar con la confirmación; desde allí vuelve a donde estaba
  const volver = String(form.get("volver") ?? "");
  redirect(`/acompanamiento/recomendar?${new URLSearchParams({ persona, evento, enviado: "1", ...(volver ? { volver } : {}) })}`);
}
