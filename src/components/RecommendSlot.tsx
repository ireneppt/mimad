// Botón "Recomendar a <nombre>" del detalle de evento: solo sale si acompañas a alguien
// (vínculo aceptado). Lleva a la pantalla de recomendar de acompañamiento (tarea B10).
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function RecommendSlot({ eventId }: { eventId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vinculos } = await supabase.from("mm_vinculos").select("persona").eq("familiar", user.id).eq("estado", "aceptado");
  const ids = (vinculos ?? []).map((v) => v.persona as string);
  if (ids.length === 0) return null;

  const { data: personas } = await supabase.from("mm_perfiles").select("id, nombre").in("id", ids);
  const only = personas?.length === 1 ? personas[0] : null;
  const href = `/acompanamiento/recomendar?${new URLSearchParams({ ...(only ? { persona: only.id } : {}), evento: eventId })}`;
  const label = only ? `Recomendar a ${only.nombre}` : "Recomendar a alguien de tu familia";

  return (
    <div className="flex flex-col gap-2">
      <Link href={href} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-lg font-semibold">
        <Heart size={22} className="text-coral-texto" aria-hidden="true" /> {label}
      </Link>
      <p className="text-center text-sm text-gris">
        {only ? `Ves «${label}» porque tienes su cuenta vinculada.` : "Lo ves porque acompañas a varias personas."}
      </p>
    </div>
  );
}
