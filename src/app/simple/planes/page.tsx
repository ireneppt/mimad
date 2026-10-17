import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Map as MapIcon } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { photoCredit } from "@/components/EventImage";
import { listPhotos } from "@/lib/categoryPhotos";
import { createClient } from "@/lib/supabase/server";
import { getEvent, getSources, isAccessible, type Fuente } from "@/lib/data";
import { formatDistance, walkingMinutes } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import LocationPanel from "@/components/simple/LocationPanel";
import {
  fromWhere, getMyInscriptionIds, getOtherPlans, getPendingRecommendations, getSimplePlans, parseWhen, whenInWords,
  whyThisPlan, WHEN_LABELS, type Plan, type When,
} from "@/lib/simplePlans";
import PlanList from "./PlanList";
import type { PlanView } from "./PlanCard";
import ConflictChoice from "@/components/simple/ConflictChoice";
import CompanionAsk from "@/components/simple/CompanionAsk";
import { getMyCompanions } from "@/lib/companion";
import { siteUrl } from "@/lib/siteUrl";

export const metadata = { title: "Planes · MiMad simplificada" };

// A partir de estos minutos andando se dice la distancia en km (andar ya no es realista)
const MAX_WALK_MINUTES = 45;

// Planes en una lista que se baja con el dedo (diseño planes-simplificada.png):
// primero los cercanos y, debajo, otros planes en Madrid para que nunca salga vacía.
export default async function SimplePlansPage({
  searchParams,
}: {
  searchParams: Promise<{ cuando?: string; hecho?: string; choque?: string; con?: string }>;
}) {
  const params = await searchParams;
  const when = parseWhen(params.cuando);
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const origin = await getOrigin(perfil); // casa, dónde estoy ahora o el centro
  const intereses = perfil?.intereses ?? [];
  const [fuentes, recomendaciones, inscritos] = await Promise.all([
    getSources(),
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    perfil ? getMyInscriptionIds(supabase, perfil.id) : Promise.resolve<string[]>([]),
  ]);
  const [plans, done] = await Promise.all([
    getSimplePlans(supabase, { home: origin, when, recomendaciones, intereses }),
    params.hecho ? getEvent(supabase, params.hecho) : null,
  ]);
  // Cerca de ti: los recomendados por la familia primero y luego del más cercano al más lejano
  const nearby = [
    ...plans.filter((p) => p.recomendadoPor),
    ...plans.filter((p) => !p.recomendadoPor).sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity)),
  ];
  // Debajo, el resto de planes de estos días en cualquier sitio (sin repetir los de arriba)
  const others = await getOtherPlans(supabase, {
    home: origin, when, recomendaciones, intereses, exclude: nearby.map((p) => p.evento.id),
  });

  // Tras apuntarse: "¿Quieres que Lucía vaya contigo?" (si tiene familiares que le acompañan)
  const companions = done && perfil ? await getMyCompanions(supabase, perfil.id) : [];
  // "Me apunto" a un plan que coincide con otro: se pregunta qué prefiere
  const [choque, con] =
    params.choque && params.con
      ? await Promise.all([getEvent(supabase, params.choque), getEvent(supabase, params.con)])
      : [null, null];

  const href = (w: When) => `/simple/planes?cuando=${w}`;
  const when_ = when === "semana" ? "esta semana" : WHEN_LABELS[when].toLowerCase(); // "hoy", "mañana", "esta semana"
  const toView = (plan: Plan, withReason: boolean) => planView(plan, { fuentes, inscritos, origin, withReason });
  // Fotos de tipo para los planes sin foto propia, sin repetir la de la tarjeta de al lado
  const photos = listPhotos([...nearby, ...others].map((p) => p.evento));
  const nearbyViews = nearby.map((p, i) => ({ ...toView(p, true), foto: photos[i] }));
  const otherViews = others.map((p, i) => ({ ...toView(p, false), foto: photos[nearby.length + i] }));
  const total = nearbyViews.length + otherViews.length;
  const capitalized = `${when_[0].toUpperCase()}${when_.slice(1)}`;

  return (
    <SimpleShell
      defaultHref="/"
      title="Planes"
      intro={
        total > 0 ? (
          <p>
            Primero, los planes <strong>cerca de ti</strong>. Más abajo, <strong>otros planes en Madrid</strong>.
          </p>
        ) : (
          <p>No hay planes en Madrid para {when_}.</p>
        )
      }
      help={
        <ol>
          <li>Arriba elige cuándo: <strong>Hoy</strong>, <strong>Mañana</strong> o toda la <strong>Semana</strong>.</li>
          <li>Baja con el dedo para ver los planes. Primero salen los que están más cerca de tu casa.</li>
          <li>Si un plan te gusta, toca <strong>Me apunto</strong>.</li>
          <li>Al final hay más planes en otros sitios de Madrid. Para ver más, toca <strong>Ver más planes</strong>.</li>
        </ol>
      }
    >
      <Link
        href="/simple"
        className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
      >
        <ArrowLeft size={26} aria-hidden="true" />
        Volver al inicio
      </Link>

      <nav aria-label="Cuándo" className="grid grid-cols-3 gap-3">
        {(Object.keys(WHEN_LABELS) as When[]).map((w) => (
          <Link
            key={w}
            href={href(w)}
            aria-current={w === when ? "page" : undefined}
            className={`flex h-16 items-center justify-center rounded-2xl border-2 text-xl font-bold ${
              w === when ? "border-tinta bg-tinta text-white" : "border-slate-500 bg-white"
            }`}
          >
            {WHEN_LABELS[w]}
          </Link>
        ))}
      </nav>

      <LocationPanel
        kind={origin.kind}
        cp={origin.cp}
        here={origin.kind === "aqui" ? { lat: origin.lat, lon: origin.lon } : null}
        loggedIn={!!perfil}
        hasHome={perfil?.lat != null && perfil?.lon != null}
      />

      {choque && con && (
        <ConflictChoice
          nuevo={{ id: choque.id, titulo: choque.titulo, cuando: whenInWords(choque) }}
          existente={{ id: con.id, titulo: con.titulo, cuando: whenInWords(con) }}
          back={href(when)}
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
        <CompanionAsk
          companions={companions}
          plan={{ titulo: done.titulo, cuando: whenInWords(done), lugar: done.lugar ?? done.direccion, url: await siteUrl(`/simple/evento/${encodeURIComponent(done.id)}`) }}
        />
      )}

      {total > 0 ? (
        <PlanList
          // key: al cambiar de pestaña la lista empieza otra vez desde arriba
          key={when}
          nearby={nearbyViews}
          others={otherViews}
          back={href(when)}
          emptyNearby={`${capitalized} no hay planes cerca de ti. Mira los de otros sitios de Madrid, aquí debajo.`}
        />
      ) : (
        when !== "semana" && (
          <Link
            href={href("semana")}
            className="bg-degradado-fuerte flex h-16 items-center justify-center gap-3 rounded-2xl text-2xl font-bold text-white"
          >
            Ver los de la semana
            <ArrowRight size={28} aria-hidden="true" />
          </Link>
        )
      )}

      <Link
        href={when === "semana" ? "/simple/mapa" : `/simple/mapa?ver=${when}`}
        className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-400 bg-white text-xl font-bold"
      >
        <MapIcon size={26} className="text-coral-texto" aria-hidden="true" /> Verlos en el mapa
      </Link>
    </SimpleShell>
  );
}

// Algunos horarios de la Agenda turística son párrafos enteros: en la tarjeta, solo la
// primera línea y como mucho 90 letras (el horario completo está en "Ver más información")
function shortText(s: string, max = 90): string {
  const line = s.split("\n")[0].replace(/[​-‍﻿]/g, "").trim().replace(/[:;,]$/, "");
  return line.length > max ? `${line.slice(0, max).replace(/[\s,.:;]+\S*$/, "")}…` : line;
}

// Textos ya preparados para la tarjeta
function planView(
  plan: Plan,
  ctx: {
    fuentes: Record<string, Fuente>;
    inscritos: string[];
    origin: Awaited<ReturnType<typeof getOrigin>>;
    withReason: boolean; // "¿Por qué este plan?" solo en los cercanos
  }
): PlanView {
  const { evento: e, km, recomendadoPor, mensaje } = plan;
  const minutos = km != null ? walkingMinutes(km) : null;
  const distancia =
    km == null || minutos == null
      ? null
      : minutos <= MAX_WALK_MINUTES
        ? `A ${minutos} minutos andando`
        : `A ${formatDistance(km)}${fromWhere(ctx.origin.kind)}`;
  return {
    id: e.id,
    titulo: e.titulo,
    categoria: e.categoria,
    imagen: e.imagen ?? null,
    credito: photoCredit(e.fuente),
    cuando: shortText(whenInWords(e)),
    lugar: e.lugar ?? e.direccion,
    distancia,
    precio: e.gratuito ? "Gratis" : e.precio ? `Cuesta ${e.precio}` : "Consultar el precio",
    accesible: isAccessible(e),
    recomendadoPor,
    mensaje,
    porque: ctx.withReason || recomendadoPor ? whyThisPlan(plan, { minutes: minutos, from: ctx.origin.kind }) : null,
    fuente: ctx.fuentes[e.fuente] ?? null,
    fuenteId: e.fuente,
    apuntada: ctx.inscritos.includes(e.id),
  };
}
