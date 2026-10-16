import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Accessibility, ArrowLeft, CalendarDays, Check, Clock, Dices, Euro, Hammer, HeartHandshake, Info, MapPin, Music, Shuffle, Sun,
  Trees, Users,
} from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { PrimarySubmit } from "@/components/simple/ui";
import ConflictChoice from "@/components/simple/ConflictChoice";
import CompanionAsk from "@/components/simple/CompanionAsk";
import SourceTag from "@/components/SourceTag";
import { createClient } from "@/lib/supabase/server";
import { getEvent, getSources, isAccessible } from "@/lib/data";
import { walkingMinutes } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { getMyCompanions } from "@/lib/companion";
import { whatsappHref } from "@/lib/phoneLinks";
import { siteUrl } from "@/lib/siteUrl";
import { fromWhere, getPendingRecommendations, getSimplePlans, whenInWords, whyThisPlan, windowFor } from "@/lib/simplePlans";
import { CUANDO, QUE, dayLabel, matchesQue, parseCuando, parseQue, type Que } from "@/lib/consejo";
import { recommend } from "@/lib/assistant";
import { joinPlan } from "../planes/actions";

export const metadata = { title: "Pedir consejo · MiMad simplificada" };

const ICONS: Record<Que, typeof Trees> = { pasear: Trees, aprender: Hammer, musica: Music, gente: Users, sorpresa: Dices };

// "Pedir consejo" (diseños cons-1/2/3 y consejo-simplificada-pasos.png): dos preguntas con
// botones grandes y un plan real recomendado. Tres toques hasta un plan.
export default async function AdvicePage({
  searchParams,
}: {
  searchParams: Promise<{ que?: string; cuando?: string; n?: string; hecho?: string; choque?: string; con?: string }>;
}) {
  const params = await searchParams;
  const que = parseQue(params.que);
  const cuando = que ? parseCuando(params.cuando) : null;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const nombre = perfil?.nombre ? `, ${perfil.nombre}` : "";

  const shell = (step: 1 | 2 | 3, children: ReactNode, help: ReactNode) => (
    <SimpleShell defaultHref="/asistente" title="Pedir consejo" help={help}>
      <BackHome />
      <Progress step={step} />
      {children}
    </SimpleShell>
  );

  // Pregunta 1: ¿Qué te apetece hacer?
  if (!que) {
    return shell(
      1,
      <>
        <Bubble>
          Hola{nombre}. <strong>¿Qué te apetece hacer?</strong> Toca una opción.
        </Bubble>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(QUE) as Que[])
            .filter((q) => q !== "sorpresa")
            .map((q) => {
              const Icon = ICONS[q];
              return (
                <Link key={q} href={`/simple/consejo?que=${q}`} className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-500 bg-white text-center text-xl font-bold">
                  <Icon size={36} className="text-coral-texto" aria-hidden="true" />
                  {QUE[q].label}
                </Link>
              );
            })}
        </div>
        <Link href="/simple/consejo?que=sorpresa" className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-bold">
          <Dices size={28} className="text-coral-texto" aria-hidden="true" />
          {QUE.sorpresa.label}
        </Link>
      </>,
      <ol>
        <li>Toca lo que te apetece hacer: pasear, aprender algo, música y baile o conocer gente.</li>
        <li>Si no lo sabes, toca <strong>Me da igual, sorpréndeme</strong>.</li>
      </ol>
    );
  }

  // Pregunta 2: ¿Cuándo te viene bien?
  if (!cuando) {
    const sub = (id: string) => {
      if (id === "semana") return null;
      const [from, to] = windowFor(id as "hoy");
      return from === to ? dayLabel(from) : `${dayLabel(from).split(" ").slice(0, 2).join(" ")} o ${dayLabel(to).split(" ").slice(0, 2).join(" ").toLowerCase()}`;
    };
    return shell(
      2,
      <>
        <Bubble>
          {QUE[que].eco} <strong>¿Cuándo te viene bien?</strong>
        </Bubble>
        <div className="flex flex-col gap-3">
          {CUANDO.map((c) => {
            const Icon = c.id === "hoy" ? Sun : c.id === "semana" ? Dices : CalendarDays;
            const s = sub(c.id);
            return (
              <Link key={c.id} href={`/simple/consejo?que=${que}&cuando=${c.id}`} className="flex min-h-20 items-center gap-4 rounded-2xl border-2 border-slate-500 bg-white px-5 py-3">
                <Icon size={32} className="shrink-0 text-coral-texto" aria-hidden="true" />
                <span>
                  <span className="block text-2xl font-bold">{c.label}</span>
                  {s && <span className="block text-lg text-gris">{s}</span>}
                </span>
              </Link>
            );
          })}
        </div>
        <Link href="/simple/consejo" className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold">
          <ArrowLeft size={26} aria-hidden="true" />
          Volver a la pregunta anterior
        </Link>
      </>,
      <ol>
        <li>Toca cuándo te viene bien: hoy, mañana, el fin de semana o cualquier día.</li>
        <li>Si te has equivocado, toca <strong>Volver a la pregunta anterior</strong>.</li>
      </ol>
    );
  }

  // Resultado: un plan real (y "Enséñame otro plan")
  const origin = await getOrigin(perfil);
  const [recomendaciones, fuentes, companions] = await Promise.all([
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    getSources(supabase),
    perfil ? getMyCompanions(supabase, perfil.id) : Promise.resolve([]),
  ]);
  const plans = await getSimplePlans(supabase, {
    home: origin,
    when: cuando,
    recomendaciones,
    intereses: perfil?.intereses ?? [],
    filter: (e) => matchesQue(que, e),
  }).then((ps) => ps.filter((p) => matchesQue(que, p.evento)));

  // El asistente (Claude si hay clave; si no, reglas) elige el mejor orden y explica por qué.
  // La respuesta se guarda 30 min, así que "Enséñame otro plan" no vuelve a preguntar.
  const consejo = await recommend({
    mensaje: `Quiero ${QUE[que].label.toLowerCase()}, ${CUANDO.find((c) => c.id === cuando)!.label.toLowerCase()}.`,
    candidatos: plans,
    persona: { id: perfil?.id ?? null, nombre: perfil?.nombre ?? null, intereses: perfil?.intereses ?? [], simplificada: true },
    origen: origin.kind,
  });
  const elegidos = consejo.elegidos.map((x) => x.plan);
  const ordered = [...elegidos, ...plans.filter((p) => !elegidos.includes(p))];
  const porque = new Map(consejo.motor === "claude" ? consejo.elegidos.map((x) => [x.plan.evento.id, x.porque]) : []);

  const n = Math.max(0, Number(params.n) || 0);
  const plan = ordered.length ? ordered[n % ordered.length] : null;
  const here = `/simple/consejo?que=${que}&cuando=${cuando}${n ? `&n=${n}` : ""}`;

  const [done, nuevo, existente] = await Promise.all([
    params.hecho ? getEvent(supabase, params.hecho) : null,
    params.choque ? getEvent(supabase, params.choque) : null,
    params.con ? getEvent(supabase, params.con) : null,
  ]);

  if (!plan) {
    const cuandoLabel = CUANDO.find((c) => c.id === cuando)!.label.toLowerCase();
    return shell(
      3,
      <>
        <Bubble>
          No he encontrado planes de <strong>{QUE[que].label.toLowerCase()}</strong> para <strong>{cuandoLabel}</strong> cerca de tu casa. ¿Probamos otra cosa?
        </Bubble>
        {cuando !== "semana" && (
          <Link href={`/simple/consejo?que=${que}&cuando=semana`} className="bg-degradado-fuerte flex h-16 items-center justify-center rounded-2xl text-2xl font-bold text-white">
            Buscar cualquier día
          </Link>
        )}
        <StartAgain />
      </>,
      <ol><li>Toca <strong>Buscar cualquier día</strong> o <strong>Empezar de nuevo</strong>.</li></ol>
    );
  }

  const e = plan.evento;
  const minutos = plan.km != null ? walkingMinutes(plan.km) : null;
  const place = e.lugar ?? e.direccion;
  const url = await siteUrl(`/simple/evento/${encodeURIComponent(e.id)}`);
  const conCompania = companions.filter((c) => whatsappHref(c.telefono, ""));
  const apuntada = done?.id === e.id;

  return shell(
    3,
    <>
      {nuevo && existente && (
        <ConflictChoice
          nuevo={{ id: nuevo.id, titulo: nuevo.titulo, cuando: whenInWords(nuevo) }}
          existente={{ id: existente.id, titulo: existente.titulo, cuando: whenInWords(existente) }}
          back={here}
        />
      )}
      {done && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border-2 border-green-700 bg-green-50 p-5 text-xl text-green-900">
          <Check size={32} strokeWidth={3} className="shrink-0" aria-hidden="true" />
          <span>
            <strong className="block text-2xl">¡Hecho! Te has apuntado.</strong>
            «{done.titulo}» ya está en <Link href="/simple/agenda" className="font-bold underline">Mis planes</Link>.
          </span>
        </p>
      )}
      {done && companions.length > 0 && (
        <CompanionAsk companions={companions} plan={{ titulo: done.titulo, cuando: whenInWords(done), lugar: done.lugar ?? done.direccion, url: await siteUrl(`/simple/evento/${encodeURIComponent(done.id)}`) }} />
      )}

      <Bubble>
        Creo que este plan <strong>te va a gustar</strong>:
      </Bubble>

      <article className="flex flex-col gap-3 rounded-3xl border-2 border-coral/50 bg-white p-5" aria-labelledby="plan">
        <h2 id="plan" className="text-[1.75rem] font-bold leading-tight">{e.titulo}</h2>
        <InfoRow icon={<Clock size={28} />} title="Cuándo">{whenInWords(e)}.</InfoRow>
        {place && (
          <InfoRow icon={<MapPin size={28} />} title="Dónde">
            {place}.{minutos != null && <strong className="block">A {minutos} minutos andando{fromWhere(origin.kind)}</strong>}
          </InfoRow>
        )}
        <InfoRow icon={<Euro size={28} />} title="Cuánto cuesta">
          {e.gratuito ? "Es gratis." : e.precio ? `Cuesta ${e.precio}.` : "Consulta el precio en la información del plan."}
        </InfoRow>
        {isAccessible(e) && (
          <InfoRow icon={<Accessibility size={28} />} title="Accesible" green>
            Se puede entrar en silla de ruedas.
          </InfoRow>
        )}
        <p className="rounded-2xl bg-crema p-4 text-xl leading-snug">
          <strong className="text-coral-texto">¿Por qué este?</strong>{" "}
          {porque.get(e.id) ?? (
            <>
              {que !== "sorpresa" && `Es para ${QUE[que].label.toLowerCase()}. `}
              {whyThisPlan(plan, { minutes: minutos, from: origin.kind })}
            </>
          )}
        </p>
        {apuntada ? (
          <p className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-xl font-bold text-green-800">
            <Check size={30} strokeWidth={3} aria-hidden="true" /> Ya te has apuntado.
          </p>
        ) : (
          <form action={joinPlan}>
            <input type="hidden" name="evento_id" value={e.id} />
            <input type="hidden" name="back" value={here} />
            <PrimarySubmit>Me apunto</PrimarySubmit>
          </form>
        )}
        <Link href={`/simple/evento/${encodeURIComponent(e.id)}?volver=${encodeURIComponent(here)}`} className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 text-xl font-semibold">
          <Info size={26} aria-hidden="true" /> Ver más información
        </Link>
        <SourceTag fuente={fuentes[e.fuente]} label={fuentes[e.fuente] ? undefined : e.fuente} className="border-t-2 border-slate-100 pt-4 !text-lg !text-tinta" />
      </article>

      {plans.length > 1 && (
        <Link href={`/simple/consejo?que=${que}&cuando=${cuando}&n=${n + 1}`} className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-tinta bg-white text-xl font-bold">
          <Shuffle size={26} aria-hidden="true" /> Enséñame otro plan
        </Link>
      )}
      {!done &&
        conCompania.map((c) => (
          <a
            key={c.id}
            href={whatsappHref(c.telefono, `¡Hola, ${c.nombre}! Estoy mirando «${e.titulo}» (${whenInWords(e).toLowerCase()}${place ? `, en ${place}` : ""}). ¿Me acompañas? Lo tienes aquí: ${url}`)!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white px-4 text-center text-xl font-semibold"
          >
            <HeartHandshake size={26} className="shrink-0 text-coral-texto" aria-hidden="true" /> Pedir a {c.nombre} que me acompañe
            <span className="sr-only">(se abre WhatsApp)</span>
          </a>
        ))}
      <StartAgain />
    </>,
    <ol>
      <li>Lee el plan. Si te gusta, toca <strong>Me apunto</strong>.</li>
      <li>Si prefieres otro, toca <strong>Enséñame otro plan</strong>.</li>
      <li>Para empezar otra vez, toca <strong>Empezar de nuevo</strong>.</li>
    </ol>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-semibold">{step === 3 ? "Tu recomendación" : `Pregunta ${step} de 2`}</p>
      <div className="flex gap-2" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full ${i <= step ? "bg-degradado" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}

// Mensaje de MiMad, como en un chat
function Bubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Image src="/icono.svg" alt="" width={48} height={48} className="shrink-0" />
      <p className="flex-1 rounded-2xl rounded-tl-sm border-2 border-slate-200 bg-white p-4 text-xl leading-snug">{children}</p>
    </div>
  );
}

function InfoRow({ icon, title, green = false, children }: { icon: ReactNode; title: string; green?: boolean; children: ReactNode }) {
  return (
    <div className={`flex gap-4 rounded-2xl p-4 text-xl leading-snug ${green ? "bg-green-50" : "bg-slate-100"}`}>
      <span className={`mt-0.5 shrink-0 ${green ? "text-green-800" : "text-coral-texto"}`} aria-hidden="true">{icon}</span>
      <div>
        <p className="text-base font-bold uppercase tracking-wide text-gris">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  );
}

function StartAgain() {
  return (
    <Link href="/simple/consejo" className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold">
      <ArrowLeft size={26} aria-hidden="true" /> Empezar de nuevo
    </Link>
  );
}

function BackHome() {
  return (
    <Link href="/simple" className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold">
      <ArrowLeft size={26} aria-hidden="true" /> Volver al inicio
    </Link>
  );
}
