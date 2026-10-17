import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Clock, MapPin, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, MADRID_CENTER } from "@/lib/profile";
import { getEvent } from "@/lib/data";
import { walkingMinutes } from "@/lib/format";
import { getAccompaniedPerson, type Persona } from "@/lib/companion";
import { buildPlan, getSimplePlans, whenInWords } from "@/lib/simplePlans";
import RecommendForm from "./RecommendForm";

export const metadata = { title: "Recomendar un plan · MiMad" };

// Recomendar un plan a la persona que acompaño:
//   ?persona=… → planes cerca de SU casa y según SUS gustos
//   ?persona=…&evento=… → mensaje opcional y enviar
//   …&enviado=1 → "Se lo has recomendado": volver a donde estaba o recomendar otro
// El detalle de evento puede enlazar aquí con ?evento=… ("Recomendar a Carmen").
// ?volver=… es la pantalla desde la que se ha entrado (el plan, el perfil…): se vuelve allí.
export default async function RecommendPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; evento?: string; enviado?: string; volver?: string }>;
}) {
  const { persona: personaId, evento: eventoId, enviado, volver: volverParam } = await searchParams;
  // Solo direcciones de la propia app ("/perfil"), nunca de otra web
  const volver = volverParam?.startsWith("/") && !volverParam.startsWith("//") ? volverParam : "/acompanamiento";
  const here = (p: { persona?: string; evento?: string }) =>
    `/acompanamiento/recomendar?${new URLSearchParams({ ...(p.persona ? { persona: p.persona } : {}), ...(p.evento ? { evento: p.evento } : {}), volver })}`;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null;

  // ¿A quién? Si solo acompaña a una persona, a ella
  let persona: Persona | null = personaId ? await getAccompaniedPerson(supabase, perfil.id, personaId) : null;
  if (!persona) {
    const { data: vs } = await supabase.from("mm_vinculos").select("persona").eq("familiar", perfil.id).eq("estado", "aceptado");
    const ids = (vs ?? []).map((v) => v.persona as string);
    if (ids.length === 1) persona = await getAccompaniedPerson(supabase, perfil.id, ids[0]);
    else {
      const { data: personas } = ids.length ? await supabase.from("mm_perfiles").select("id, nombre").in("id", ids) : { data: [] };
      return (
        <Shell title="¿A quién se lo recomiendas?" back={volver}>
          {(personas ?? []).length === 0 ? (
            <p className="rounded-3xl bg-slate-100 p-5 text-lg">
              Todavía no acompañas a nadie. <Link href="/acompanamiento" className="font-semibold text-coral-texto underline">Crea una invitación</Link>.
            </p>
          ) : (
            (personas ?? []).map((p) => (
              <Link key={p.id} href={here({ persona: p.id, evento: eventoId })} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-lg font-semibold">
                {p.nombre} <ChevronRight size={22} aria-hidden="true" />
              </Link>
            ))
          )}
        </Shell>
      );
    }
  }
  if (!persona) return null;

  const home = persona.lat != null && persona.lon != null ? { lat: persona.lat, lon: persona.lon } : MADRID_CENTER;

  // Plan elegido: mensaje y enviar
  if (eventoId) {
    const evento = await getEvent(supabase, eventoId);
    if (!evento) {
      return (
        <Shell title="Ese plan ya no está" back={here({ persona: persona.id })}>
          <p className="text-lg">Puede que haya terminado. Elige otro.</p>
        </Shell>
      );
    }
    const plan = buildPlan(evento, { home, intereses: persona.intereses, recomendaciones: [] });

    // Ya enviado: se queda aquí con la confirmación (antes llevaba siempre a Acompañamiento)
    if (enviado) {
      return (
        <Shell title="¡Recomendación enviada!" back={volver}>
          <p role="status" className="flex items-start gap-3 rounded-3xl bg-crema p-5 text-lg">
            <Check size={26} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
            <span>
              Se lo has recomendado a <strong>{persona.nombre}</strong>. Le saldrá el primero en sus planes y le llegará un aviso.
            </span>
          </p>
          <PlanSummary plan={plan} nombre={persona.nombre} />
          <Link href={volver} className="bg-degradado flex h-14 items-center justify-center rounded-2xl text-lg font-semibold">
            Volver
          </Link>
          <Link href={here({ persona: persona.id })} className="flex h-14 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg font-medium">
            Recomendar otro plan a {persona.nombre}
          </Link>
        </Shell>
      );
    }

    // Si se ha entrado desde el propio plan, la flecha vuelve al plan; si no, a la lista
    const fromThisPlan = volver === `/evento/${encodeURIComponent(evento.id)}` || volver === `/evento/${evento.id}`;
    return (
      <Shell title={`Recomendar a ${persona.nombre}`} back={fromThisPlan ? volver : here({ persona: persona.id })}>
        <PlanSummary plan={plan} nombre={persona.nombre} />
        <RecommendForm persona={persona.id} evento={evento.id} nombre={persona.nombre} volver={volver} />
      </Shell>
    );
  }

  // Elegir plan: los mismos que vería ella, cerca de su casa y según sus gustos
  const plans = await getSimplePlans(supabase, { home, when: "semana", recomendaciones: [], intereses: persona.intereses });
  return (
    <Shell title={`Recomendar a ${persona.nombre}`} back={volver}>
      <p className="text-lg leading-relaxed text-gris">
        Planes de esta semana cerca de la casa de {persona.nombre}, primero los que encajan con sus gustos. Toca uno para recomendárselo.
      </p>
      {plans.length === 0 && <p className="rounded-3xl bg-slate-100 p-5">No hay planes cerca esta semana.</p>}
      <ul className="flex flex-col gap-3">
        {plans.map((plan) => (
          <li key={plan.evento.id}>
            <Link href={here({ persona: persona.id, evento: plan.evento.id })} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex-1">
                <PlanLines plan={plan} nombre={persona.nombre} />
              </span>
              <ChevronRight size={22} className="shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

type PlanT = ReturnType<typeof buildPlan>;

function PlanLines({ plan, nombre }: { plan: PlanT; nombre: string }) {
  const e = plan.evento;
  return (
    <>
      {plan.gusto && (
        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-crema px-2.5 py-0.5 text-sm font-semibold text-coral-texto">
          <Star size={14} aria-hidden="true" /> Le gusta: {plan.gusto}
        </span>
      )}
      <span className="block font-bold leading-snug">{e.titulo}</span>
      <span className="flex items-center gap-1.5 text-gris">
        <Clock size={16} aria-hidden="true" /> {whenInWords(e)}
      </span>
      {(e.lugar ?? e.direccion) && (
        <span className="flex items-center gap-1.5 text-gris">
          <MapPin size={16} aria-hidden="true" /> {e.lugar ?? e.direccion}
          {plan.km != null && ` · ${walkingMinutes(plan.km)} min andando desde casa de ${nombre}`}
        </span>
      )}
    </>
  );
}

function PlanSummary({ plan, nombre }: { plan: PlanT; nombre: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <PlanLines plan={plan} nombre={nombre} />
      <p className="mt-2 text-sm text-gris">{plan.evento.gratuito ? "Gratis" : plan.evento.precio ?? "Consultar precio"}</p>
    </div>
  );
}

function Shell({ title, back, children }: { title: string; back: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-col gap-5 px-5 pt-6 text-tinta">
      <header className="flex items-center gap-3">
        <Link href={back} aria-label="Volver" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100">
          <ArrowLeft size={24} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </header>
      {children}
    </main>
  );
}
