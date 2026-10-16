import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Map as MapIcon } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { createClient } from "@/lib/supabase/server";
import { getEvent, getSources, isAccessible } from "@/lib/data";
import { walkingMinutes } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import LocationPanel from "@/components/simple/LocationPanel";
import {
  getMyInscriptionIds, getPendingRecommendations, getSimplePlans, parseWhen, whenInWords, whyThisPlan, WHEN_LABELS, type When,
} from "@/lib/simplePlans";
import PlanSteps, { type PlanView } from "./PlanSteps";
import ConflictChoice from "@/components/simple/ConflictChoice";
import CompanionAsk from "@/components/simple/CompanionAsk";
import { getMyCompanions } from "@/lib/companion";
import { siteUrl } from "@/lib/siteUrl";


export const metadata = { title: "Planes · MiMad simplificada" };

// Planes cerca de casa, uno por pantalla (diseño planes-simplificada.png)
export default async function SimplePlansPage({
  searchParams,
}: {
  searchParams: Promise<{ cuando?: string; n?: string; hecho?: string; choque?: string; con?: string }>;
}) {
  const params = await searchParams;
  const when = parseWhen(params.cuando);
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const origin = await getOrigin(perfil); // casa, dónde estoy ahora o el centro
  const [fuentes, recomendaciones, inscritos] = await Promise.all([
    getSources(supabase),
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    perfil ? getMyInscriptionIds(supabase, perfil.id) : Promise.resolve<string[]>([]),
  ]);
  const [plans, done] = await Promise.all([
    getSimplePlans(supabase, { home: origin, when, recomendaciones, intereses: perfil?.intereses ?? [] }),
    params.hecho ? getEvent(supabase, params.hecho) : null,
  ]);
  // Tras apuntarse: "¿Quieres que Lucía vaya contigo?" (si tiene familiares que le acompañan)
  const companions = done && perfil ? await getMyCompanions(supabase, perfil.id) : [];
  // "Me apunto" a un plan que coincide con otro: se pregunta qué prefiere
  const [choque, con] =
    params.choque && params.con
      ? await Promise.all([getEvent(supabase, params.choque), getEvent(supabase, params.con)])
      : [null, null];

  const total = plans.length;
  const index = Math.min(Math.max(Number(params.n) || 0, 0), Math.max(total - 1, 0));
  const href = (w: When) => `/simple/planes?cuando=${w}`;

  // Textos ya preparados para la tarjeta (la tarjeta cambia de plan sin volver al servidor)
  const views: PlanView[] = plans.map((plan) => {
    const { evento: e, km, recomendadoPor, mensaje } = plan;
    const minutos = km != null ? walkingMinutes(km) : null;
    return {
    id: e.id,
    titulo: e.titulo,
    categoria: e.categoria,
    cuando: whenInWords(e),
    lugar: e.lugar ?? e.direccion,
    minutosAndando: minutos,
    precio: e.gratuito ? "Gratis" : e.precio ? `Cuesta ${e.precio}` : "Consultar el precio",
    accesible: isAccessible(e),
    recomendadoPor,
    mensaje,
    porque: whyThisPlan(plan, { minutes: minutos, from: origin.kind }),
    fuente: fuentes[e.fuente] ?? null,
    fuenteId: e.fuente,
    apuntada: inscritos.includes(e.id),
    };
  });

  return (
    <SimpleShell
      defaultHref="/"
      title="Planes cerca de ti"
      intro={
        total > 0 ? (
          <p>
            {total === 1 ? (
              <>Hay <strong>1 plan</strong> cerca de tu casa.</>
            ) : (
              <>Te enseñamos <strong>{total} planes</strong> cerca de tu casa, de uno en uno.</>
            )}
          </p>
        ) : (
          <p>No hay planes cerca de tu casa para {when === "semana" ? "esta semana" : WHEN_LABELS[when].toLowerCase()}.</p>
        )
      }
      help={
        <ol>
          <li>Arriba elige cuándo: <strong>Hoy</strong>, <strong>Mañana</strong> o toda la <strong>Semana</strong>.</li>
          <li>Primero salen los planes que encajan con tus gustos. Lee el plan y, si te gusta, toca <strong>Me apunto</strong>.</li>
          <li>Para ver otro plan, toca <strong>Ver otro plan</strong>.</li>
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
          back={`${href(when)}${index ? `&n=${index}` : ""}`}
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

      {views.length > 0 ? (
        <PlanSteps plans={views} initial={index} cuando={when} />
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
