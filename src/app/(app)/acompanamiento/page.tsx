import Link from "next/link";
import {
  ArrowLeft, Bell, CalendarDays, Check, Clock, Heart, Hourglass, Phone, Plus, ShieldCheck, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { daysLeft, formatCode, getAccompanied, timeAgo, type Acompanada, type Invitacion } from "@/lib/companion";
import { relativeWhen } from "@/lib/simpleAgenda";
import { getEvent } from "@/lib/data";
import { cancelInvite, createInvite } from "./actions";
import InviteShare from "./InviteShare";
import StopConfirm from "./StopConfirm";

export const metadata = { title: "Personas que acompañas · MiMad" };

// Acompañamiento (diseño acompanamiento.png): el familiar ve a las personas que acompaña,
// su próximo plan, novedades, y les recomienda planes. También gestiona las invitaciones.
export default async function CompanionPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; recomendado?: string; dejado?: string }>;
}) {
  const { nueva, recomendado, dejado } = await searchParams;
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null; // el middleware ya obliga a tener cuenta
  const [{ activas, pendientes }, plan] = await Promise.all([
    getAccompanied(supabase, perfil.id),
    recomendado ? getEvent(supabase, recomendado) : null,
  ]);

  return (
    <main className="flex flex-col gap-6 px-5 pt-6 text-tinta">
      <header className="flex items-center gap-3">
        <Link href="/perfil" aria-label="Volver al perfil" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100">
          <ArrowLeft size={24} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold">Personas que acompañas</h1>
      </header>

      <p className="text-lg leading-relaxed text-gris">
        Puedes ver la agenda de estas personas y recomendarles planes. Ellas deciden siempre si se apuntan.
      </p>

      {plan && (
        <p role="status" className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-green-900">
          <Check size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Recomendación enviada: <strong>{plan.titulo}</strong>. Le aparecerá destacada en su inicio.
          </span>
        </p>
      )}
      {dejado && (
        <p role="status" className="rounded-2xl bg-slate-100 p-4">Has dejado de acompañar a esa persona.</p>
      )}

      {activas.map((a) => (
        <PersonCard key={a.vinculoId} a={a} />
      ))}

      {pendientes.map((inv) => (
        <InviteCard key={inv.id} inv={inv} nombre={perfil.nombre} isNew={inv.id === nueva} />
      ))}

      {activas.length === 0 && pendientes.length === 0 && (
        <p className="rounded-3xl border border-slate-200 bg-white p-5 text-lg leading-relaxed">
          Todavía no acompañas a nadie. Crea un <strong>código de invitación</strong> y dáselo a la persona que quieras
          acompañar (por ejemplo, tu madre o un vecino). Cuando lo escriba en su app, quedaréis unidos.
        </p>
      )}

      <form action={createInvite}>
        <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-tinta text-lg font-semibold text-white">
          <Plus size={22} aria-hidden="true" /> {activas.length || pendientes.length ? "Acompañar a otra persona" : "Crear código de invitación"}
        </button>
      </form>

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="puedes">
        <h2 id="puedes" className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck size={22} className="text-green-700" aria-hidden="true" /> Qué puedes hacer como acompañante
        </h2>
        <ul className="flex flex-col gap-2">
          {["Ver los planes a los que se ha apuntado.", "Recomendarle planes, que verá destacados en su app.", "Ver si se apunta a lo que le recomiendas."].map((t) => (
            <li key={t} className="flex gap-2">
              <Check size={20} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" /> {t}
            </li>
          ))}
          {["Apuntarle a planes sin que lo acepte.", "Cambiar sus datos."].map((t) => (
            <li key={t} className="flex gap-2">
              <X size={20} className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </section>

      {activas.map((a) => (
        <StopConfirm key={a.vinculoId} vinculoId={a.vinculoId} nombre={a.persona.nombre} />
      ))}
    </main>
  );
}

function PersonCard({ a }: { a: Acompanada }) {
  const p = a.persona;
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-labelledby={`persona-${p.id}`}>
      <div className="flex items-center gap-4 bg-crema p-5">
        <span className="bg-degradado flex h-16 w-16 shrink-0 items-center justify-center rounded-full p-1" aria-hidden="true">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-bold text-coral-texto">
            {p.nombre.charAt(0).toUpperCase()}
          </span>
        </span>
        <div className="flex-1">
          <h2 id={`persona-${p.id}`} className="text-xl font-bold">{p.nombre}</h2>
          {p.municipio && <p className="text-gris">{p.municipio}</p>}
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-0.5 text-sm font-semibold text-green-800">
            <Check size={16} aria-hidden="true" /> Acompañamiento activo
          </span>
        </div>
        {p.telefono && (
          <a href={`tel:+34${p.telefono}`} aria-label={`Llamar a ${p.nombre}`} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
            <Phone size={24} aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gris">Su próximo plan</h3>
          {a.proximo ? (
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="font-bold">{a.proximo.evento.titulo}</p>
              <p className="flex items-center gap-1.5 text-gris">
                <Clock size={16} aria-hidden="true" /> {relativeWhen(a.proximo)}
              </p>
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-100 p-4 text-gris">No tiene planes apuntados. ¡Recomiéndale uno!</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/acompanamiento/${p.id}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 font-semibold">
            <CalendarDays size={20} className="text-coral-texto" aria-hidden="true" /> Ver su agenda
          </Link>
          <Link href={`/acompanamiento/recomendar?persona=${p.id}`} className="bg-degradado flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold text-tinta">
            <Heart size={20} aria-hidden="true" /> Recomendar plan
          </Link>
        </div>

        {a.novedades.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-gris">Últimas novedades</h3>
            <ul className="divide-y divide-slate-100">
              {a.novedades.map((n, i) => {
                const Icon = n.tipo === "apuntada" ? Check : n.tipo === "recomendada" ? Heart : Bell;
                return (
                  <li key={i} className="flex gap-3 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.tipo === "apuntada" ? "bg-green-50 text-green-700" : "bg-crema text-coral-texto"}`} aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block leading-snug">{n.texto}</span>
                      <span className="text-sm text-gris">{timeAgo(n.fecha)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

function InviteCard({ inv, nombre, isNew }: { inv: Invitacion; nombre: string; isNew: boolean }) {
  const dias = daysLeft(inv.expira_at);
  return (
    <article id={`invitacion-${inv.id}`} className={`scroll-mt-4 overflow-hidden rounded-3xl border bg-white ${isNew ? "border-coral" : "border-slate-200"}`}>
      <div className="flex items-center gap-4 bg-slate-50 p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600" aria-hidden="true">
          <Hourglass size={26} />
        </span>
        <div>
          <h2 className="text-xl font-bold">{isNew ? "Nueva invitación" : "Invitación pendiente"}</h2>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-sm font-semibold text-amber-900">
            <Hourglass size={14} aria-hidden="true" /> Esperando a que acepte
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <p className="leading-relaxed text-gris">
          Envíale este código. Lo escribe en su app, en <strong className="text-tinta">Mi cuenta → Añadir a una persona que me acompaña</strong>.
        </p>
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-coral bg-crema px-5 py-4">
          <span className="font-mono text-3xl font-bold tracking-[0.2em]" aria-label={`Código ${inv.codigo.split("").join(" ")}`}>
            {formatCode(inv.codigo)}
          </span>
          <span className="text-sm text-gris">Caduca en {dias} {dias === 1 ? "día" : "días"}</span>
        </div>
        <InviteShare codigo={formatCode(inv.codigo)} nombre={nombre} />
        <form action={cancelInvite}>
          <input type="hidden" name="id" value={inv.id} />
          <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-gris underline-offset-4 hover:underline">
            <X size={18} aria-hidden="true" /> Cancelar invitación
          </button>
        </form>
      </div>
    </article>
  );
}
