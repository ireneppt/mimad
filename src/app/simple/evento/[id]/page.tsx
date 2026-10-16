import Link from "next/link";
import type { ReactNode } from "react";
import {
  Accessibility, ArrowLeft, Check, Clock, Euro, ExternalLink, Footprints, Heart, MapPin, Navigation, Sparkles,
} from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { PrimarySubmit } from "@/components/simple/ui";
import RouteMapLazy from "@/components/simple/RouteMapLazy";
import LeaveConfirm from "@/components/simple/LeaveConfirm";
import ScrollToHash from "@/components/simple/ScrollToHash";
import ConflictChoice from "@/components/simple/ConflictChoice";
import SourceTag from "@/components/SourceTag";
import { createClient } from "@/lib/supabase/server";
import { accessibilityLabels, getEvent, getSources, isAccessible, type Evento } from "@/lib/data";
import { categoryInfo } from "@/lib/categories";
import { walkingMinutes } from "@/lib/format";
import { getCurrentProfile, homeLocation } from "@/lib/profile";
import { buildPlan, getMyInscriptionIds, getPendingRecommendations, whenInWords, whyThisPlan } from "@/lib/simplePlans";
import { joinPlan } from "../../planes/actions";

export const metadata = { title: "Plan · MiMad simplificada" };

// Detalle de un plan en la versión simplificada (diseño evento-simplificada.png):
// lo imprescindible en grande, una acción principal "Me apunto" y debajo "Cómo llegar".
export default async function SimpleEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string; hecho?: string; quitado?: string; con?: string }>;
}) {
  const { id: rawId } = await params;
  const query = await searchParams;
  const id = decodeURIComponent(rawId);
  // Vuelta a la lista en el mismo plan donde estaba (solo rutas de la versión simplificada)
  const volver = query.volver?.startsWith("/simple/") ? query.volver : "/simple/planes";

  const supabase = await createClient();
  const [evento, perfil, fuentes] = await Promise.all([getEvent(supabase, id), getCurrentProfile(supabase), getSources(supabase)]);

  if (!evento) {
    return (
      <SimpleShell defaultHref="/" title="No encontramos este plan" intro={<p>Puede que ya haya terminado.</p>} help={<p>Toca <strong>Volver a los planes</strong> para ver otros.</p>}>
        <BackLink href={volver} />
      </SimpleShell>
    );
  }

  const [recomendaciones, inscritos] = await Promise.all([
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    perfil ? getMyInscriptionIds(supabase, perfil.id) : Promise.resolve<string[]>([]),
  ]);
  const home = homeLocation(perfil);
  const hasHome = perfil?.lat != null && perfil?.lon != null;
  const plan = buildPlan(evento, { home, intereses: perfil?.intereses ?? [], recomendaciones });
  const minutos = plan.km != null ? walkingMinutes(plan.km) : null;
  const apuntada = inscritos.includes(evento.id);
  const { label, icon: CategoryIcon } = categoryInfo(evento.categoria);
  const here = `/simple/evento/${encodeURIComponent(evento.id)}?volver=${encodeURIComponent(volver)}`;
  // "Me apunto" a un plan que coincide con otro de su agenda: se pregunta qué prefiere
  const conflicto = query.con && !apuntada ? await getEvent(supabase, query.con) : null;
  const duration = durationText(evento);
  const extras = accessibilityLabels(evento).filter((l) => !/^Instalación|Sin información|Parcialmente/.test(l));

  return (
    <SimpleShell
      defaultHref="/"
      title={evento.titulo}
      help={
        <ol>
          <li>Lee cuándo es, dónde es y cuánto cuesta.</li>
          <li>Si quieres ir, toca el botón grande <strong>Me apunto</strong>.</li>
          <li>Abajo, en <strong>Cómo llegar</strong>, verás el camino desde tu casa.</li>
        </ol>
      }
    >
      <BackLink href={volver} />

      {conflicto && (
        <ConflictChoice
          nuevo={{ id: evento.id, titulo: evento.titulo, cuando: whenInWords(evento) }}
          existente={{ id: conflicto.id, titulo: conflicto.titulo, cuando: whenInWords(conflicto) }}
          back={here}
        />
      )}

      {query.hecho === evento.id && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border-2 border-green-700 bg-green-50 p-5 text-xl text-green-900">
          <Check size={32} strokeWidth={3} className="shrink-0" aria-hidden="true" />
          <span>
            <strong className="block text-2xl">¡Hecho! Te has apuntado.</strong>
            Lo tienes en <Link href="/simple/agenda" className="font-bold underline">Mis planes</Link>.
          </span>
        </p>
      )}
      {query.quitado && !apuntada && (
        <p role="status" className="rounded-2xl border-2 border-slate-500 bg-slate-100 p-5 text-xl">
          Te has quitado de este plan. Si cambias de idea, puedes volver a apuntarte.
        </p>
      )}

      {/* Los datos abiertos no traen imagen: fondo de marca con el icono de la categoría */}
      <div className="bg-degradado relative flex h-40 items-center justify-center rounded-3xl">
        <CategoryIcon size={72} className="text-white" aria-hidden="true" />
        <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-lg font-bold text-coral-texto">
          {plan.recomendadoPor ? (
            <>
              <Heart size={20} aria-hidden="true" /> Te lo recomienda {plan.recomendadoPor}
            </>
          ) : (
            label
          )}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <InfoBox icon={<Clock size={30} />} title="Cuándo">
          {whenInWords(evento)}.{duration && ` ${duration}.`}
        </InfoBox>
        <InfoBox icon={<MapPin size={30} />} title="Dónde">
          {[evento.lugar, niceAddress(evento.direccion)].filter(Boolean).join(". ") || "Consultar el lugar"}
          {minutos != null && (
            <strong className="block">
              A {minutos} minutos andando{hasHome ? " de tu casa" : ""}
            </strong>
          )}
        </InfoBox>
        <InfoBox icon={<Euro size={30} />} title="Cuánto cuesta">
          {evento.gratuito ? "Es gratis." : evento.precio ? `Cuesta ${evento.precio}.` : "Consulta el precio en la web del plan."}
        </InfoBox>
        {isAccessible(evento) && (
          <InfoBox icon={<Accessibility size={30} />} title="Accesible" tone="green">
            Se puede entrar en silla de ruedas.
            {extras.length > 0 && <span className="block">También: {extras.join(", ").toLowerCase()}.</span>}
          </InfoBox>
        )}
      </div>

      <section className="flex gap-3 rounded-2xl bg-crema p-5 text-xl leading-snug" aria-labelledby="porque">
        <Sparkles size={30} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" />
        <div>
          <h2 id="porque" className="font-bold">¿Por qué este plan?</h2>
          <p>{whyThisPlan(plan, { minutes: minutos, hasHome })}</p>
          {plan.mensaje && (
            <p className="mt-2 italic">
              «{plan.mensaje}»<span className="not-italic"> — {plan.recomendadoPor}</span>
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="trata">
        <h2 id="trata" className="text-2xl font-bold">¿De qué trata?</h2>
        <About evento={evento} label={label} />
        {evento.url && (
          <a
            href={evento.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 px-4 text-xl font-semibold"
          >
            <ExternalLink size={24} aria-hidden="true" />
            Ver la página oficial del plan
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        )}
      </section>

      {apuntada ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-3 rounded-2xl bg-green-50 p-5 text-xl font-bold text-green-800">
            <Check size={32} strokeWidth={3} aria-hidden="true" />
            Ya te has apuntado a este plan.
          </p>
          <LeaveConfirm eventoId={evento.id} titulo={evento.titulo} back={here} />
        </div>
      ) : (
        <form action={joinPlan}>
          <input type="hidden" name="evento_id" value={evento.id} />
          <input type="hidden" name="back" value={here} />
          <PrimarySubmit>Me apunto</PrimarySubmit>
        </form>
      )}

      {evento.lat != null && evento.lon != null && (
        <section className="flex flex-col gap-4" aria-labelledby="llegar">
          <ScrollToHash />
          <h2 id="llegar" className="scroll-mt-4 text-2xl font-bold">Cómo llegar</h2>
          <RouteMapLazy
            home={hasHome ? home : null}
            place={{ lat: evento.lat, lon: evento.lon }}
            homeLabel="Tu casa"
          />
          {minutos != null && hasHome && (
            <p className="flex items-start gap-3 rounded-2xl bg-blue-50 p-5 text-xl leading-snug">
              <Footprints size={28} className="mt-0.5 shrink-0 text-blue-800" aria-hidden="true" />
              <span>
                {minutos <= 25 ? (
                  <>
                    Andando tardarás unos <strong>{minutos} minutos</strong>.
                  </>
                ) : (
                  <>
                    Andando son unos <strong>{minutos} minutos</strong>. Es mejor ir en autobús o metro.
                  </>
                )}
              </span>
            </p>
          )}
          <a
            href={directionsUrl({ lat: evento.lat, lon: evento.lon }, hasHome ? home : null, hasHome ? minutos : null)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-tinta bg-white px-4 text-xl font-bold"
          >
            <Navigation size={26} aria-hidden="true" />
            {hasHome && minutos != null && minutos > 25 ? "Ver cómo ir en autobús o metro" : "Ver el camino en el mapa"}
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </section>
      )}

      <SourceTag
        fuente={fuentes[evento.fuente]}
        label={fuentes[evento.fuente] ? undefined : evento.fuente}
        className="border-t-2 border-slate-100 pt-4 !text-lg !text-tinta"
      />

      <BackLink href={volver} />
    </SimpleShell>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
    >
      <ArrowLeft size={26} aria-hidden="true" />
      Volver a los planes
    </Link>
  );
}

function InfoBox({ icon, title, tone = "gray", children }: { icon: ReactNode; title: string; tone?: "gray" | "green"; children: ReactNode }) {
  return (
    <div className={`flex gap-4 rounded-2xl p-5 text-xl leading-snug ${tone === "green" ? "bg-green-50" : "bg-slate-100"}`}>
      <span className={`mt-0.5 shrink-0 ${tone === "green" ? "text-green-800" : "text-coral-texto"}`} aria-hidden="true">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-bold uppercase tracking-wide text-gris">{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

// Descripción del dataset: corta, y entera si se pide. Si no hay, una frase sencilla.
function About({ evento, label }: { evento: Evento; label: string }) {
  const text = evento.descripcion?.trim();
  if (!text) {
    return (
      <p className="text-xl leading-relaxed">
        Es una actividad de <strong>{label.toLowerCase()}</strong>. Los datos abiertos no traen más detalles; puedes verlos en la
        página oficial.
      </p>
    );
  }
  if (text.length <= 280) return <p className="text-xl leading-relaxed">{text}</p>;
  // Corta en el último punto antes de 280 letras (o en un espacio)
  const cut = text.lastIndexOf(". ", 280) > 120 ? text.lastIndexOf(". ", 280) + 1 : text.lastIndexOf(" ", 280);
  return (
    <details className="group text-xl leading-relaxed">
      <summary className="cursor-pointer list-none">
        <span className="group-open:hidden">
          {text.slice(0, cut)}…{" "}
          <span className="font-bold text-coral-texto underline">Leer todo</span>
        </span>
        <span className="hidden font-bold text-coral-texto underline group-open:inline">Leer menos</span>
      </summary>
      <p>{text}</p>
    </details>
  );
}

// "Dura 2 horas" (solo si la hora de fin es real: en la agenda, las 23:59 significa "sin hora de fin")
function durationText(e: Evento): string | null {
  if (!e.fecha_inicio || !e.fecha_fin) return null;
  if (e.fecha_inicio.slice(0, 10) !== e.fecha_fin.slice(0, 10) || e.fecha_fin.slice(11, 16) === "23:59") return null;
  const mins = (Date.parse(e.fecha_fin) - Date.parse(e.fecha_inicio)) / 60_000;
  if (!(mins > 0) || mins > 8 * 60) return null;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `Dura ${m} minutos`;
  const hours = h === 1 ? "1 hora" : `${h} horas`;
  return m ? `Dura ${hours} y ${m} minutos` : `Dura ${hours}`;
}

// "CALLE BRONCE 16" → "Calle Bronce 16" (algunas fuentes vienen en mayúsculas)
function niceAddress(s: string | null): string | null {
  if (!s) return null;
  if (s !== s.toUpperCase()) return s;
  const small = new Set(["de", "del", "la", "las", "el", "los", "y"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Ruta en el mapa del móvil (Google Maps abre la app si está instalada; si no, la web)
function directionsUrl(to: { lat: number; lon: number }, from: { lat: number; lon: number } | null, minutes: number | null): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${to.lat},${to.lon}`,
    travelmode: minutes != null && minutes > 25 ? "transit" : "walking",
  });
  if (from) params.set("origin", `${from.lat},${from.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
