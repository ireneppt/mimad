import Link from "next/link";
import { ArrowRight, CalendarHeart, Heart, HeartHandshake, MessageCircleMore, Sparkles, UserRound } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getPendingRecommendations } from "@/lib/simplePlans";
import { getMyAgenda, relativeWhen, type AgendaItem } from "@/lib/simpleAgenda";
import { getMyCompanions } from "@/lib/companion";

export const metadata = { title: "Inicio · MiMad simplificada" };

// Inicio de la versión simplificada (diseño inicio-simplificada.png):
// saludo, recomendación de la familia y pocos botones grandes.
export default async function SimpleHomePage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const [recomendaciones, agenda, familiares] = await Promise.all([
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    perfil ? getMyAgenda(supabase, perfil.id) : Promise.resolve([]),
    perfil ? getMyCompanions(supabase, perfil.id) : Promise.resolve([]),
  ]);
  const next = nextPlan(agenda);
  const rec = recomendaciones[0];

  return (
    <SimpleShell
      defaultHref="/"
      title={perfil?.nombre ? `¡Hola, ${perfil.nombre}!` : "¡Hola!"}
      intro={<p>¿Qué quieres hacer hoy?</p>}
      help={
        <ol>
          <li>Para buscar algo que hacer cerca de casa, toca <strong>Ver planes sugeridos</strong>.</li>
          <li>Para ver los planes a los que te has apuntado, toca <strong>Mis planes</strong>.</li>
          {rec && <li>Si un familiar te ha recomendado un plan, toca <strong>Verlo</strong>.</li>}
          {perfil && familiares.length === 0 && (
            <li>Si un familiar te ha dado un código, toca <strong>¿Te ha dado un código tu familiar?</strong> y escríbelo.</li>
          )}
        </ol>
      }
    >
      {rec && (
        <div className="flex items-center gap-4 rounded-3xl border-2 border-coral/50 bg-crema p-5">
          <Heart size={36} className="shrink-0 text-coral-texto" aria-hidden="true" />
          <p className="flex-1 text-xl leading-snug">
            <strong>{rec.de_nombre}</strong> te ha recomendado un plan.
          </p>
          <Link
            href="/simple/planes"
            className="flex h-16 shrink-0 items-center rounded-2xl bg-tinta px-6 text-xl font-bold text-white"
          >
            Verlo
          </Link>
        </div>
      )}

      <Link
        href="/simple/planes"
        className="bg-degradado-fuerte flex items-center gap-4 rounded-3xl p-6 text-white shadow-lg shadow-coral/30"
      >
        <Sparkles size={48} className="shrink-0" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-[2rem] font-bold leading-tight">Ver planes sugeridos</span>
          <span className="block text-xl">Actividades cerca de tu casa</span>
        </span>
        <ArrowRight size={32} className="shrink-0" aria-hidden="true" />
      </Link>

      <Link href="/simple/agenda" className="flex items-center gap-4 rounded-3xl border-2 border-slate-300 bg-slate-100 p-6">
        <CalendarHeart size={48} className="shrink-0 text-coral-texto" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-[2rem] font-bold leading-tight">Mis planes</span>
          <span className="block text-xl leading-snug text-gris">
            {next ? (
              <>
                Tienes {next.count === 1 ? "1 plan" : `${next.count} planes`}: <strong className="text-tinta">{next.text}</strong>
              </>
            ) : (
              "Todavía no te has apuntado a ningún plan"
            )}
          </span>
        </span>
        <ArrowRight size={32} className="shrink-0" aria-hidden="true" />
      </Link>

      {/* Aún no le acompaña nadie: acceso directo para escribir el código de su familiar */}
      {perfil && familiares.length === 0 && (
        <Link href="/simple/familia" className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-coral-texto bg-crema p-5">
          <HeartHandshake size={44} className="shrink-0 text-coral-texto" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-2xl font-bold leading-tight">¿Te ha dado un código tu familiar?</span>
            <span className="block text-xl leading-snug text-gris">Escríbelo aquí para que te acompañe</span>
          </span>
          <ArrowRight size={32} className="shrink-0" aria-hidden="true" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/simple/consejo"
          className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-slate-300 p-4 text-center text-xl font-bold"
        >
          <MessageCircleMore size={40} className="text-coral-texto" aria-hidden="true" />
          Pedir consejo
        </Link>
        <Link
          href="/simple/perfil"
          className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-slate-300 p-4 text-center text-xl font-bold"
        >
          <UserRound size={40} className="text-coral-texto" aria-hidden="true" />
          Mi cuenta
        </Link>
      </div>
    </SimpleShell>
  );
}

// Cuántos planes tiene y el más próximo en palabras ("mañana, a las 5 de la tarde")
function nextPlan(agenda: AgendaItem[]): { count: number; text: string } | null {
  if (agenda.length === 0) return null;
  const when = relativeWhen(agenda[0]);
  return { count: agenda.length, text: when[0].toLowerCase() + when.slice(1) };
}
