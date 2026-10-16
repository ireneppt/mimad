import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getMyEntity } from "@/lib/entityEvents";
import BackButton from "@/components/BackButton";
import EventForm from "../EventForm";
import { EntityCard } from "../parts";

export const metadata = { title: "Publicar un plan · MiMad" };

// Publicar un plan (diseño crear-evento.png)
export default async function NewEventPage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null;
  const [entidad, { data: municipios }] = await Promise.all([
    getMyEntity(supabase, perfil.id),
    supabase.from("v_municipios").select("nombre").order("nombre"),
  ]);

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <BackButton fallback="/entidad" />
        <h1 className="flex-1 text-2xl font-bold">Publicar un plan</h1>
      </header>
      <div className="flex flex-col gap-5 bg-fondo px-5 pb-10 pt-5">
        {!entidad ? (
          <p className="rounded-2xl bg-amber-50 p-5 text-base">
            Antes de publicar, completa los datos de tu entidad en el <Link href="/entidad" className="font-semibold underline">panel</Link>.
          </p>
        ) : (
          <>
            <EntityCard nombre={entidad.nombre} verificada={entidad.verificada} foto={perfil.foto_url} />
            <p className="text-base text-gris">
              {entidad.verificada
                ? "Como tu entidad está verificada, el plan se publica al momento y aparece en el Inicio y el Mapa de las personas cercanas."
                : "Tu entidad está pendiente de revisión: el plan quedará guardado y se publicará cuando la revisemos."}
            </p>
            <EventForm municipios={(municipios ?? []).map((m) => m.nombre as string)} defaultMunicipio={perfil.municipio ?? "Madrid"} />
          </>
        )}
      </div>
    </main>
  );
}
