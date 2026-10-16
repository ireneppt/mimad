"use server";

// La persona acompañada escribe el código que le ha dado su familiar (función aceptar_vinculo)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error?: string };

export async function acceptInvite(_prev: AcceptState, form: FormData): Promise<AcceptState> {
  // "abc-def", "ABC DEF" → "ABCDEF"
  const codigo = String(form.get("codigo") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (codigo.length !== 6) return { error: "El código tiene 6 letras y números. Míralo bien y escríbelo otra vez." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aceptar_vinculo", { p_codigo: codigo });
  // La base de datos explica el problema en español (caducado, ya vinculados…)
  if (error) return { error: error.message || "No se ha podido usar el código. Prueba otra vez." };
  const nombre = (data as { familiar_nombre: string }[] | null)?.[0]?.familiar_nombre ?? "tu familiar";
  revalidatePath("/", "layout");
  redirect(`/simple/familia?unida=${encodeURIComponent(nombre)}`);
}
