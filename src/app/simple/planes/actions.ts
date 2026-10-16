"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "Me apunto" desde la versión simplificada (misma tabla que la versión por defecto)
export async function joinPlan(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const back = String(form.get("back") ?? "/simple/planes");
  const backPath = back.startsWith("/simple/planes") ? back : "/simple/planes";
  if (!eventoId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Invitada: para apuntarse hace falta cuenta
  if (!user) redirect(`/simple/login?next=${encodeURIComponent(backPath)}`);

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
  redirect(`${backPath}${backPath.includes("?") ? "&" : "?"}apuntada=1`);
}
