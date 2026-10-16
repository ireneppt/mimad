import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAccompaniedPerson } from "@/lib/companion";
import { dateTile, getMyAgenda, relativeWhen } from "@/lib/simpleAgenda";

export const metadata = { title: "Su agenda · MiMad" };

// Agenda de la persona a la que acompaño. La base de datos solo la deja ver
// si el vínculo está aceptado (regla "ver mis inscripciones y las de mi persona").
export default async function AccompaniedAgendaPage({ params }: { params: Promise<{ persona: string }> }) {
  const { persona: personaId } = await params;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const persona = perfil ? await getAccompaniedPerson(supabase, perfil.id, personaId) : null;
  if (!persona) notFound();
  const agenda = await getMyAgenda(supabase, persona.id);

  return (
    <main className="flex flex-col gap-5 px-5 pt-6 text-tinta">
      <header className="flex items-center gap-3">
        <Link href="/acompanamiento" aria-label="Volver" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100">
          <ArrowLeft size={24} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold">Agenda de {persona.nombre}</h1>
      </header>

      {agenda.length === 0 ? (
        <p className="rounded-3xl bg-slate-100 p-5 text-lg">{persona.nombre} no tiene planes apuntados ahora mismo.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {agenda.map((item) => {
            const t = dateTile(item);
            return (
              <li key={item.evento.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-tinta py-2 text-white" aria-hidden="true">
                  <span className="text-xs font-semibold">{t.weekday}</span>
                  <span className="text-2xl font-bold leading-none">{t.day}</span>
                  <span className="text-xs">{t.month}</span>
                </span>
                <span className="flex-1">
                  <span className="block font-bold leading-snug">{item.evento.titulo}</span>
                  <span className="block text-gris">{relativeWhen(item)}</span>
                  {(item.evento.lugar ?? item.evento.direccion) && (
                    <span className="mt-0.5 flex items-center gap-1 text-sm text-gris">
                      <MapPin size={14} aria-hidden="true" /> {item.evento.lugar ?? item.evento.direccion}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={`/acompanamiento/recomendar?persona=${persona.id}`}
        className="bg-degradado flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-semibold"
      >
        <Heart size={22} aria-hidden="true" /> Recomendar un plan a {persona.nombre}
      </Link>
    </main>
  );
}
