import Link from "next/link";
import { ArrowLeft, ChevronRight, Clock, Info, MapPin, Plus, Route, TriangleAlert } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import EventImage, { photoCredit } from "@/components/EventImage";
import LeaveConfirm from "@/components/simple/LeaveConfirm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { dateTile, fullDate, getMyAgenda, overlappingIds, relativeDay, relativeWhen, type AgendaItem } from "@/lib/simpleAgenda";

export const metadata = { title: "Mis planes · MiMad simplificada" };

const HERE = "/simple/agenda";
const eventHref = (id: string, hash = "") => `/simple/evento/${encodeURIComponent(id)}?volver=${encodeURIComponent(HERE)}${hash}`;

// Agenda de la versión simplificada (diseño agenda-simplificada.png):
// el próximo plan destacado y, debajo, los demás. Misma tabla que la agenda normal (mm_inscripciones).
export default async function SimpleAgendaPage({ searchParams }: { searchParams: Promise<{ quitado?: string }> }) {
  const { quitado } = await searchParams;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const items = perfil ? await getMyAgenda(supabase, perfil.id) : [];
  const [next, ...later] = items;
  const overlaps = overlappingIds(items);

  return (
    <SimpleShell
      defaultHref="/agenda"
      title="Mis planes"
      intro={
        items.length === 0 ? (
          <p>Todavía no te has apuntado a ningún plan.</p>
        ) : (
          <p>
            Tienes <strong>{items.length === 1 ? "1 plan" : `${items.length} planes`}</strong> apuntados.
          </p>
        )
      }
      help={
        <ol>
          <li>Arriba está tu <strong>próximo plan</strong>. Toca <strong>Cómo llegar</strong> para ver el camino.</li>
          <li>Si no puedes ir, toca <strong>Ya no puedo ir</strong> y después <strong>Sí, quitar el plan</strong>.</li>
          <li>Debajo, en <strong>Después</strong>, están los demás planes. Toca uno para verlo entero.</li>
        </ol>
      }
    >
      <BackHome />

      {quitado && (
        <p role="status" className="rounded-2xl border-2 border-slate-500 bg-slate-100 p-5 text-xl">
          Hemos quitado el plan de tu lista. Si cambias de idea, puedes volver a apuntarte.
        </p>
      )}

      {overlaps.size > 0 && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border-2 border-amber-600 bg-amber-50 p-5 text-xl leading-snug">
          <TriangleAlert size={30} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            Tienes <strong>planes que coinciden</strong> el mismo día a la misma hora. Están marcados abajo: elige a cuál vas a ir.
          </span>
        </p>
      )}

      {next ? <NextPlan item={next} overlaps={overlaps.has(next.evento.id)} /> : <SearchPlans primary />}

      {later.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="despues">
          <h2 id="despues" className="text-[1.75rem] font-bold">Después</h2>
          <p className="text-xl text-gris">Toca un plan para ver toda su información.</p>
          <ul className="flex flex-col gap-3">
            {later.map((item) => (
              <li key={item.evento.id}>
                <LaterPlan item={item} overlaps={overlaps.has(item.evento.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {next && <SearchPlans />}
      <BackHome />
    </SimpleShell>
  );
}

function OverlapBadge() {
  return (
    <span className="flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-base font-bold text-amber-900">
      <TriangleAlert size={20} aria-hidden="true" /> Coincide con otro plan
    </span>
  );
}

function NextPlan({ item, overlaps }: { item: AgendaItem; overlaps: boolean }) {
  const e = item.evento;
  const place = e.lugar ?? e.direccion;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="proximo">
      <div className="bg-degradado-fuerte flex flex-col gap-4 rounded-3xl p-5 text-white shadow-lg shadow-coral/30">
        <p id="proximo">
          <span className="block text-lg font-bold uppercase tracking-wide">Tu próximo plan es</span>
          <span className="block text-[2.5rem] font-bold leading-tight">{relativeDay(item.date)}</span>
        </p>
        {/* Foto del plan o, si no tiene, una de las de su tipo */}
        <EventImage src={e.imagen} categoria={e.categoria} title={e.titulo} className="h-36 rounded-2xl" iconSize={60} credit={photoCredit(e.fuente)} />
        {overlaps && <OverlapBadge />}
        <h2 className="text-[1.75rem] font-bold leading-tight">{e.titulo}</h2>
        <ul className="flex flex-col gap-2 text-xl leading-snug">
          <li className="flex gap-3">
            <Clock size={26} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {fullDate(item)}
              {item.weekly && <span className="block text-lg">Es un taller de todas las semanas.</span>}
            </span>
          </li>
          {place && (
            <li className="flex gap-3">
              <MapPin size={26} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{place}</span>
            </li>
          )}
        </ul>
        <Link
          href={eventHref(e.id, "#llegar")}
          className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-white text-xl font-bold text-tinta"
        >
          <Route size={26} className="text-coral-texto" aria-hidden="true" />
          Cómo llegar
        </Link>
        <Link
          href={eventHref(e.id)}
          className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-white text-xl font-bold text-tinta"
        >
          <Info size={26} className="text-coral-texto" aria-hidden="true" />
          Ver toda la información
        </Link>
      </div>
      <LeaveConfirm eventoId={e.id} titulo={e.titulo} back={HERE} />
    </section>
  );
}

function LaterPlan({ item, overlaps }: { item: AgendaItem; overlaps: boolean }) {
  const tile = dateTile(item);
  return (
    <Link
      href={eventHref(item.evento.id)}
      className="flex items-center gap-4 rounded-2xl border-2 border-slate-300 bg-white p-4"
    >
      <span className="flex w-20 shrink-0 flex-col items-center rounded-xl bg-tinta py-2 text-white" aria-hidden="true">
        <span className="text-base font-semibold">{tile.weekday}</span>
        <span className="text-3xl font-bold leading-none">{tile.day}</span>
        <span className="text-sm">{tile.month}</span>
      </span>
      <span className="flex-1">
        <span className="block text-xl font-bold leading-snug">{item.evento.titulo}</span>
        <span className="block text-lg leading-snug text-gris">{relativeWhen(item)}</span>
        {overlaps && (
          <span className="mt-1 block">
            <OverlapBadge />
          </span>
        )}
      </span>
      <ChevronRight size={28} className="shrink-0" aria-hidden="true" />
    </Link>
  );
}

function SearchPlans({ primary = false }: { primary?: boolean }) {
  return (
    <Link
      href="/simple/planes"
      className={
        primary
          ? "bg-degradado-fuerte flex h-16 items-center justify-center gap-3 rounded-2xl text-2xl font-bold text-white"
          : "flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-500 text-xl font-bold"
      }
    >
      <Plus size={26} aria-hidden="true" />
      {primary ? "Buscar planes" : "Buscar más planes"}
    </Link>
  );
}

function BackHome() {
  return (
    <Link
      href="/simple"
      className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
    >
      <ArrowLeft size={26} aria-hidden="true" />
      Volver al inicio
    </Link>
  );
}
