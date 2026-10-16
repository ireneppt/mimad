import Link from "next/link";
import { Accessibility, ArrowLeft, ArrowRight, Check, Clock, Euro, Heart, Info, MapPin } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { PrimarySubmit } from "@/components/simple/ui";
import SourceTag from "@/components/SourceTag";
import { createClient } from "@/lib/supabase/server";
import { getEvent, getSources, isAccessible } from "@/lib/data";
import { categoryInfo } from "@/lib/categories";
import { walkingMinutes } from "@/lib/format";
import { getCurrentProfile, homeLocation } from "@/lib/profile";
import {
  getMyInscriptionIds, getPendingRecommendations, getSimplePlans, parseWhen, whenInWords, WHEN_LABELS, type When,
} from "@/lib/simplePlans";
import { joinPlan } from "./actions";

export const metadata = { title: "Planes · MiMad simplificada" };

// Planes cerca de casa, uno por pantalla (diseño planes-simplificada.png)
export default async function SimplePlansPage({
  searchParams,
}: {
  searchParams: Promise<{ cuando?: string; n?: string; hecho?: string }>;
}) {
  const params = await searchParams;
  const when = parseWhen(params.cuando);
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const [fuentes, recomendaciones, inscritos] = await Promise.all([
    getSources(supabase),
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    perfil ? getMyInscriptionIds(supabase, perfil.id) : Promise.resolve<string[]>([]),
  ]);
  const [plans, done] = await Promise.all([
    getSimplePlans(supabase, { home: homeLocation(perfil), when, recomendaciones }),
    params.hecho ? getEvent(supabase, params.hecho) : null,
  ]);

  const total = plans.length;
  const index = Math.min(Math.max(Number(params.n) || 0, 0), Math.max(total - 1, 0));
  const plan = plans[index];
  const href = (w: When, n = 0) => `/simple/planes?cuando=${w}${n ? `&n=${n}` : ""}`;
  const here = href(when, index);
  const joined = plan ? inscritos.includes(plan.evento.id) : false;

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
          <li>Lee el plan. Si te gusta, toca <strong>Me apunto</strong>.</li>
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

      {done && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border-2 border-green-700 bg-green-50 p-5 text-xl text-green-900">
          <Check size={32} strokeWidth={3} className="shrink-0" aria-hidden="true" />
          <span>
            <strong className="block text-2xl">¡Hecho! Te has apuntado.</strong>
            «{done.titulo}» ya está en <Link href="/simple/agenda" className="font-bold underline">Mis planes</Link>.
          </span>
        </p>
      )}

      {plan ? (
        <PlanCard
          plan={plan}
          fuente={fuentes[plan.evento.fuente]}
          joined={joined}
          back={here}
          position={`Plan ${index + 1} de ${total}`}
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

      {total > 1 && (
        <div className="flex flex-col gap-3">
          {index < total - 1 ? (
            <Link
              href={href(when, index + 1)}
              className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-500 text-xl font-bold"
            >
              Ver otro plan
              <ArrowRight size={26} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href={href(when)}
              className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-500 text-xl font-bold"
            >
              Volver al primer plan
            </Link>
          )}
          {index > 0 && (
            <Link
              href={href(when, index - 1)}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl text-xl font-semibold underline"
            >
              <ArrowLeft size={24} aria-hidden="true" />
              Plan anterior
            </Link>
          )}
        </div>
      )}
    </SimpleShell>
  );
}

function PlanCard({
  plan, fuente, joined, back, position,
}: {
  plan: Awaited<ReturnType<typeof getSimplePlans>>[number];
  fuente?: Parameters<typeof SourceTag>[0]["fuente"];
  joined: boolean;
  back: string;
  position: string;
}) {
  const e = plan.evento;
  const { label, icon: CategoryIcon } = categoryInfo(e.categoria);
  const place = e.lugar ?? e.direccion;
  const walk = plan.km != null ? walkingMinutes(plan.km) : null;

  return (
    <article className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white" aria-label={position}>
      {/* Los datos abiertos no traen imagen: fondo de marca con el icono de la categoría */}
      <div className="bg-degradado relative flex h-40 items-center justify-center">
        <CategoryIcon size={72} className="text-white" aria-hidden="true" />
        {plan.recomendadoPor ? (
          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto">
            <Heart size={20} aria-hidden="true" /> Te lo recomienda {plan.recomendadoPor}
          </span>
        ) : (
          <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto">{label}</span>
        )}
        <span className="absolute bottom-3 right-4 rounded-full bg-tinta/80 px-3 py-1 text-base font-semibold text-white">
          {position}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-[1.75rem] font-bold leading-tight">{e.titulo}</h2>

        <ul className="flex flex-col gap-3 text-xl leading-snug">
          <li className="flex gap-3">
            <Clock size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
            <span>{whenInWords(e)}</span>
          </li>
          {place && (
            <li className="flex gap-3">
              <MapPin size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>
                {place}
                {walk != null && <strong className="block">A {walk} minutos andando</strong>}
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <Euro size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
            <span>{e.gratuito ? "Gratis" : e.precio ? `Cuesta ${e.precio}` : "Consultar el precio"}</span>
          </li>
          {isAccessible(e) && (
            <li className="flex gap-3">
              <Accessibility size={28} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
              <span>Accesible en silla de ruedas</span>
            </li>
          )}
        </ul>

        {joined ? (
          <p className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-xl font-bold text-green-800">
            <Check size={30} strokeWidth={3} aria-hidden="true" />
            Ya te has apuntado a este plan.
          </p>
        ) : (
          <form action={joinPlan}>
            <input type="hidden" name="evento_id" value={e.id} />
            <input type="hidden" name="back" value={back} />
            <PrimarySubmit>Me apunto</PrimarySubmit>
          </form>
        )}

        <Link
          href={`/simple/evento/${encodeURIComponent(e.id)}`}
          className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 text-xl font-semibold"
        >
          <Info size={26} aria-hidden="true" />
          Ver más información
        </Link>

        <SourceTag
          fuente={fuente}
          label={fuente ? undefined : e.fuente}
          className="border-t-2 border-slate-100 pt-4 !text-lg !text-tinta"
        />
      </div>
    </article>
  );
}
