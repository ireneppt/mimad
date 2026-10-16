"use server";

// "Me apunto" / "Ya no voy" en la versión por defecto. Misma tabla (mm_inscripciones)
// y misma comprobación de planes que coinciden que la versión simplificada.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEvent } from "@/lib/data";
import { findConflict } from "@/lib/simpleAgenda";
import { formatWhen } from "@/lib/format";

export type JoinResult =
  | { status: "joined" | "left" }
  | { status: "login" }
  | { status: "conflict"; conflict: { id: string; titulo: string; cuando: string } }
  | { status: "error"; message: string };

export async function joinEvent(eventoId: string, force = false): Promise<JoinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "login" };

  const evento = await getEvent(supabase, eventoId);
  if (!evento) return { status: "error", message: "Este plan ya no está disponible." };

  // ¿Coincide con otro plan de su agenda el mismo día a la misma hora?
  if (!force) {
    const conflict = await findConflict(supabase, user.id, evento);
    if (conflict) {
      const w = formatWhen(conflict);
      return {
        status: "conflict",
        conflict: { id: conflict.id, titulo: conflict.titulo, cuando: [w.day, w.time].filter(Boolean).join(", ") },
      };
    }
  }

  const { error } = await supabase.from("mm_inscripciones").insert({ evento_id: eventoId });
  // 23505 = ya estaba apuntada: no es un error para la persona
  if (error && error.code !== "23505") return { status: "error", message: "No se ha podido apuntar. Prueba otra vez." };

  // Si se lo había recomendado un familiar, la recomendación queda aceptada
  await supabase
    .from("mm_recomendaciones")
    .update({ estado: "aceptada" })
    .eq("para", user.id)
    .eq("evento_id", eventoId)
    .eq("estado", "pendiente");

  revalidatePath("/", "layout");
  return { status: "joined" };
}

export async function leaveEvent(eventoId: string): Promise<JoinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "login" };

  const { error } = await supabase.from("mm_inscripciones").delete().eq("usuario", user.id).eq("evento_id", eventoId);
  if (error) return { status: "error", message: "No se ha podido quitar el plan. Prueba otra vez." };

  revalidatePath("/", "layout");
  return { status: "left" };
}
