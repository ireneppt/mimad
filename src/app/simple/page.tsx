import Link from "next/link";
import { ArrowRight, CalendarHeart, Heart, MessageCircleMore, Sparkles, UserRound } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { createClient } from "@/lib/supabase/server";
import { getEventsByIds, type Evento } from "@/lib/data";
import { formatWhen } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { getMyInscriptionIds, getPendingRecommendations } from "@/lib/simplePlans";

export const metadata = { title: "Inicio · MiMad simplificada" };

// Inicio de la versión simplificada (diseño inicio-simplificada.png):
// saludo, recomendación de la familia y pocos botones grandes.
export default async function SimpleHomePage() {
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const [recomendaciones, inscritos] = perfil
    ? await Promise.all([getPendingRecommendations(supabase, perfil.id), getMyInscriptionIds(supabase, perfil.id)])
    : [[], []];
  const next = nextPlan(await getEventsByIds(supabase, inscritos));
  const rec = recomendaciones[0];

  return (
    <SimpleShell
      defaultHref="/"
      title={perfil?.nombre ? `¡Hola, ${perfil.nombre}!` : "¡Hola!"}
      intro={<p>¿Qué quieres hacer hoy?</p>}
      help={
        <ol>
          <li>Para buscar algo que hacer cerca de casa, toca <strong>Ver planes</strong>.</li>
          <li>Para ver los planes a los que te has apuntado, toca <strong>Mis planes</strong>.</li>
          {rec && <li>Si un familiar te ha recomendado un plan, toca <strong>Verlo</strong>.</li>}
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
          <span className="block text-[2rem] font-bold leading-tight">Ver planes</span>
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

// Planes apuntados que aún no han pasado (v_eventos ya quita los terminados) y el más próximo en palabras
function nextPlan(eventos: Evento[]): { count: number; text: string } | null {
  if (eventos.length === 0) return null;
  const sorted = [...eventos].sort((a, b) => (a.fecha_inicio ?? "9999").localeCompare(b.fecha_inicio ?? "9999"));
  const when = formatWhen(sorted[0]);
  const day = when.day[0].toLowerCase() + when.day.slice(1);
  return { count: eventos.length, text: when.time ? `${day} a las ${when.time}` : day };
}
