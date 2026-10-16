import Link from "next/link";
import type { ReactNode } from "react";
import { BellOff, CalendarClock, CalendarX2, Heart, Megaphone, HeartCrack, Hourglass, Settings, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getEventsByIds } from "@/lib/data";
import { getMyAgenda } from "@/lib/simpleAgenda";
import { formatWhen } from "@/lib/format";
import { timeAgo, daysLeft } from "@/lib/companion";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";

export const metadata = { title: "Notificaciones · MiMad" };

type Filter = "todas" | "acompanamiento" | "planes";
type Action = { label: string; href: string; primary?: boolean; external?: boolean };
type Item = {
  key: string;
  group: Filter; // a qué filtro pertenece (además de "todas")
  title: string;
  detail: string | null;
  at: string; // fecha del aviso (ISO)
  unread: boolean;
  actor: { nombre: string; foto: string | null } | null;
  icon: ReactNode;
  actions: Action[];
};

const COMPANION_TYPES = new Set(["inscripcion", "recomendacion_aceptada", "recomendacion_descartada", "vinculo", "vinculo_fin"]);
const todayIso = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);

function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Notificaciones dentro de la app (diseño notificaciones-defecto.png, pantalla central)
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const filter: Filter = ver === "acompanamiento" || ver === "planes" ? ver : "todas";
  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  if (!perfil) return null; // el middleware ya obliga a tener cuenta

  const [{ data: rows }, agenda, { data: invites }] = await Promise.all([
    supabase.from("mm_notificaciones").select("id, tipo, titulo, texto, evento_id, leida, created_at, actor").order("created_at", { ascending: false }).limit(60),
    getMyAgenda(supabase, perfil.id),
    supabase.from("mm_vinculos").select("id, expira_at").eq("familiar", perfil.id).eq("estado", "pendiente"),
  ]);
  const notes = rows ?? [];

  // Datos para pintar: eventos (cuándo y dónde) y quién provoca cada aviso (foto y nombre)
  const eventIds = [...new Set(notes.map((n) => n.evento_id).filter(Boolean) as string[])];
  const actorIds = [...new Set(notes.map((n) => n.actor).filter(Boolean) as string[])];
  const [eventos, { data: actores }] = await Promise.all([
    getEventsByIds(supabase, eventIds),
    actorIds.length ? supabase.from("mm_perfiles").select("id, nombre, foto_url").in("id", actorIds) : Promise.resolve({ data: [] }),
  ]);
  const evento = (id: string | null) => (id ? eventos.find((e) => e.id === id) : undefined);
  const actor = (id: string | null) => {
    const a = id ? actores?.find((x) => x.id === id) : undefined;
    return a ? { nombre: a.nombre as string, foto: (a.foto_url as string | null) ?? null } : null;
  };
  const planHref = (id: string) => `/evento/${encodeURIComponent(id)}`;
  const whenOf = (id: string | null) => {
    const e = evento(id);
    if (!e) return null;
    const w = formatWhen(e);
    return [w.day, w.time].filter(Boolean).join(" · ");
  };

  const items: Item[] = [];

  // 1) Recordatorios (se calculan ahora): planes de hoy y de mañana
  const today = todayIso();
  const tomorrow = addDays(today, 1);
  for (const a of agenda.filter((x) => x.date === today || x.date === tomorrow)) {
    const e = a.evento;
    const directions = e.lat != null && e.lon != null
      ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: `${e.lat},${e.lon}`, travelmode: "walking" })}`
      : null;
    items.push({
      key: `recordatorio-${e.id}`,
      group: "planes",
      title: `${a.date === today ? "Hoy" : "Mañana"}: ${e.titulo}`,
      detail: [e.lugar, a.time].filter(Boolean).join(" · ") || null,
      at: new Date().toISOString(),
      unread: false, // se calcula cada vez: con punto rojo no se quitaría nunca
      actor: null,
      icon: <CalendarClock size={24} className="text-coral-texto" />,
      actions: [
        ...(directions ? [{ label: "Cómo llegar", href: directions, primary: true, external: true }] : []),
        { label: "Ver plan", href: planHref(e.id) },
      ],
    });
  }

  // 2) Invitaciones que caducan pronto (se calculan ahora)
  for (const inv of (invites ?? []).filter((i) => new Date(i.expira_at) > new Date() && daysLeft(i.expira_at) <= 3)) {
    const d = daysLeft(inv.expira_at);
    items.push({
      key: `invitacion-${inv.id}`,
      group: "acompanamiento",
      title: "Nadie ha aceptado aún tu invitación",
      detail: d <= 1 ? "Caduca hoy o mañana" : `Caduca en ${d} días`,
      at: new Date().toISOString(),
      unread: false,
      actor: null,
      icon: <Hourglass size={24} className="text-amber-700" />,
      actions: [{ label: "Ver la invitación", href: "/acompanamiento" }],
    });
  }

  // 3) Avisos guardados (los crea la base de datos)
  for (const n of notes) {
    const who = actor(n.actor);
    const when = whenOf(n.evento_id);
    const actions: Action[] = [];
    if (["inscripcion", "recomendacion_aceptada"].includes(n.tipo) && n.actor) actions.push({ label: "Ver su agenda", href: `/agenda?de=${n.actor}`, primary: true });
    if (n.tipo === "vinculo" && n.actor) {
      const iAmFamiliar = n.titulo.endsWith("ha aceptado tu invitación");
      actions.push(iAmFamiliar ? { label: "Ver su agenda", href: `/agenda?de=${n.actor}`, primary: true } : { label: "Ver en mi perfil", href: "/perfil#vinculadas" });
    }
    if (n.tipo === "recomendacion" && n.evento_id && evento(n.evento_id)) actions.push({ label: "Ver plan", href: planHref(n.evento_id), primary: true });
    else if (n.evento_id && evento(n.evento_id)) actions.push({ label: "Ver plan", href: planHref(n.evento_id) });

    items.push({
      key: n.id,
      group: COMPANION_TYPES.has(n.tipo) ? "acompanamiento" : "planes",
      title: n.titulo,
      detail: [n.texto ? (n.tipo === "recomendacion" ? `«${n.texto}»` : n.texto) : null, when].filter(Boolean).join(" · ") || null,
      at: n.created_at,
      unread: !n.leida,
      actor: who,
      icon:
        n.tipo === "recomendacion" ? <Heart size={24} className="text-coral-texto" />
        : n.tipo === "mensaje" ? <Megaphone size={24} className="text-coral-texto" />
        : n.tipo === "plan_cambio" ? <CalendarX2 size={24} className="text-amber-700" />
        : n.tipo === "recomendacion_descartada" || n.tipo === "vinculo_fin" ? <HeartCrack size={24} className="text-slate-600" />
        : n.tipo === "vinculo" ? <UserPlus size={24} className="text-violet-700" />
        : <Users size={24} className="text-violet-700" />,
      actions,
    });
  }

  // Al abrir la pantalla, lo no leído pasa a leído (el punto rojo se ve esta vez)
  if (notes.some((n) => !n.leida)) {
    await supabase.from("mm_notificaciones").update({ leida: true }).eq("usuario", perfil.id).eq("leida", false);
  }

  const shown = items.filter((i) => filter === "todas" || i.group === filter);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const groups = [
    { title: "Hoy", items: shown.filter((i) => i.at.slice(0, 10) >= today) },
    { title: "Esta semana", items: shown.filter((i) => i.at.slice(0, 10) < today && i.at >= weekAgo) },
    { title: "Antes", items: shown.filter((i) => i.at < weekAgo) },
  ];

  const chip = (f: Filter, label: string) => (
    <Link
      key={f}
      href={f === "todas" ? "/notificaciones" : `/notificaciones?ver=${f}`}
      aria-pressed={filter === f}
      className={`flex h-11 shrink-0 items-center rounded-full px-4 text-base font-medium ${filter === f ? "bg-tinta text-white" : "bg-slate-100 text-tinta"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex flex-col gap-3 border-b border-slate-100 bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
        <div className="flex items-center gap-1">
          <BackButton />
          <h1 className="flex-1 text-2xl font-bold">Notificaciones</h1>
          <Link href="/perfil#t-avisos" aria-label="Ajustes de avisos" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Settings size={22} aria-hidden="true" />
          </Link>
        </div>
        <nav aria-label="Filtrar avisos" className="sin-barra flex gap-2 overflow-x-auto px-3">
          {chip("todas", "Todas")}
          {chip("acompanamiento", "Acompañamiento")}
          {chip("planes", "Planes")}
        </nav>
      </header>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <BellOff size={44} className="text-gris" aria-hidden="true" />
          <p className="text-xl font-semibold">No tienes avisos{filter === "todas" ? "" : " de este tipo"}</p>
          <p className="text-base text-gris">
            Aquí verás los recordatorios de tus planes, las recomendaciones de tu familia y las novedades de las personas que acompañas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col bg-fondo pb-8">
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <section key={g.title} aria-labelledby={`g-${g.title}`}>
                  <h2 id={`g-${g.title}`} className="px-5 pb-2 pt-5 text-sm font-semibold uppercase tracking-wider text-gris">{g.title}</h2>
                  <ul className="flex flex-col divide-y divide-slate-100 border-y border-slate-100">
                    {g.items.map((i) => (
                      <li key={i.key} className={`flex gap-3 px-5 py-4 ${i.unread ? "bg-coral/5" : "bg-white"}`}>
                        {i.actor ? (
                          <Avatar url={i.actor.foto} name={i.actor.nombre} size={48} tone="ambar" />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200" aria-hidden="true">{i.icon}</span>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <p className="text-lg font-semibold leading-snug">
                            {i.title}
                            {i.unread && <span className="sr-only"> (nuevo)</span>}
                          </p>
                          {i.detail && <p className="text-base text-gris">{i.detail}</p>}
                          {i.actions.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {i.actions.map((a) => (
                                <a
                                  key={a.label}
                                  href={a.href}
                                  {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                  className={`flex h-10 items-center rounded-xl px-4 text-base font-semibold ${a.primary ? "bg-degradado text-white" : "border border-slate-300 bg-white"}`}
                                >
                                  {a.label}
                                  {a.external && <span className="sr-only"> (se abre Google Maps)</span>}
                                </a>
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-gris">{i.key.startsWith("recordatorio-") || i.key.startsWith("invitacion-") ? "Recordatorio" : timeAgo(i.at)}</p>
                        </div>
                        {i.unread && <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-coral" aria-hidden="true" />}
                      </li>
                    ))}
                  </ul>
                </section>
              )
          )}
        </div>
      )}
    </main>
  );
}
