"use client";

// Contenido de la agenda: próximo plan con cuenta atrás, calendario del mes con un punto
// por plan (color según el tipo) y la lista agrupada en Hoy / Esta semana / Más adelante.
// Al tocar un día del calendario, la lista se queda solo con ese día.
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, ChevronLeft, ChevronRight, CircleAlert, Clock, LoaderCircle, MapPin, Plus, Repeat, Route, Users } from "lucide-react";
import { categoryInfo } from "@/lib/categories";
import { leaveEvent } from "../evento/[id]/actions";
import type { AgendaPlan } from "./types";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const WEEK_HEAD = ["L", "M", "X", "J", "V", "S", "D"];
// Colores por tipo de plan (contraste suficiente sobre blanco)
const PALETTE = ["#d6334a", "#15803d", "#6d28d9", "#b45309", "#1d4ed8", "#0f766e", "#be185d", "#475569"];

const todayIso = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function AgendaView({ plans, going, ownerName }: { plans: AgendaPlan[]; going: number | null; ownerName: string | null }) {
  const today = todayIso();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [month, setMonth] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const mine = ownerName === null;

  // Un color fijo por tipo de plan, en el orden en que aparecen
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => {
      if (!map.has(p.label)) map.set(p.label, PALETTE[map.size % PALETTE.length]);
    });
    return map;
  }, [plans]);

  // ¿Qué planes caen un día? Los semanales, todos los días de su semana desde su próxima vez
  const plansOn = (date: string) => plans.filter((p) => (p.weekly ? p.weekday === weekdayOf(date) && date >= p.date : p.date === date));

  const next = plans[0];
  const endOfWeek = addDays(today, (7 - weekdayOf(today)) % 7); // domingo
  const list = selectedDay ? plansOn(selectedDay).map((p) => ({ ...p, date: selectedDay })) : plans;
  const groups: { title: string; items: AgendaPlan[] }[] = selectedDay
    ? [{ title: longDay(selectedDay), items: list }]
    : [
        { title: "Hoy", items: list.filter((p) => p.date === today) },
        { title: "Esta semana", items: list.filter((p) => p.date > today && p.date <= endOfWeek) },
        { title: "Más adelante", items: list.filter((p) => p.date > endOfWeek) },
      ];

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center">
        <CalendarX2 size={48} className="text-coral-texto" aria-hidden="true" />
        <p className="text-xl font-semibold">{mine ? "Aún no te has apuntado a ningún plan" : `${ownerName} aún no se ha apuntado a ningún plan`}</p>
        <p className="text-base text-gris">
          {mine ? "Cuando te inscribas en un plan, aparecerá aquí con su día y su hora." : "Puedes recomendarle alguno desde Acompañamiento."}
        </p>
        <Link href={mine ? "/" : "/acompanamiento"} className="bg-degradado flex h-12 items-center rounded-2xl px-6 text-lg font-semibold text-white">
          {mine ? "Buscar planes" : "Recomendar un plan"}
        </Link>
      </div>
    );
  }

  return (
    <>
      {next && <NextPlan plan={next} going={going} ownerName={ownerName} />}

      <Calendar
        month={month}
        setMonth={setMonth}
        today={today}
        selectedDay={selectedDay}
        onSelect={(d) => setSelectedDay((cur) => (cur === d ? null : d))}
        dotsFor={(d) => [...new Set(plansOn(d).map((p) => colors.get(p.label)!))].slice(0, 3)}
        legend={[...colors.entries()]}
      />

      <section aria-labelledby="proximos" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="proximos" className="text-2xl font-bold">{mine ? "Tus próximos planes" : `Planes de ${ownerName}`}</h2>
          {selectedDay && (
            <button type="button" onClick={() => setSelectedDay(null)} className="text-base font-semibold text-coral-texto">
              Ver todos
            </button>
          )}
        </div>

        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div key={g.title} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gris">{g.title}</h3>
                {g.items.map((p) => (
                  <PlanRow key={`${p.id}-${p.date}`} plan={p} color={colors.get(p.label)!} canLeave={mine} />
                ))}
              </div>
            )
        )}
        {selectedDay && list.length === 0 && (
          <p className="rounded-2xl bg-white p-5 text-center text-base text-gris">No hay planes el {longDay(selectedDay).toLowerCase()}.</p>
        )}

        <Link href="/" className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-lg font-semibold">
          <Plus size={22} aria-hidden="true" /> Buscar más planes
        </Link>
      </section>
    </>
  );
}

// "Jueves 22 de octubre"
function longDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = d.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" });
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

function relative(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  return longDay(date);
}

// Tarjeta del próximo plan con cuenta atrás (días, horas, minutos)
function NextPlan({ plan, going, ownerName }: { plan: AgendaPlan; going: number | null; ownerName: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Hora local del plan (el móvil está en Madrid); sin hora, se cuenta hasta el principio del día
  const target = new Date(`${plan.date}T${plan.time ?? "00:00"}:00`).getTime();
  const left = now === null ? null : Math.max(0, target - now);
  const parts = left === null ? null : { d: Math.floor(left / 86_400_000), h: Math.floor((left / 3_600_000) % 24), m: Math.floor((left / 60_000) % 60) };
  const started = left === 0;
  const today = todayIso();
  const others = going != null ? going - 1 : null; // sin contar a la persona

  return (
    <section aria-labelledby="proximo" className="bg-degradado relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-coral/25">
      <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" aria-hidden="true" />
      <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{ownerName ? `Próximo plan de ${ownerName}` : "Tu próximo plan"}</p>
      <h2 id="proximo" className="mt-1 text-2xl font-bold leading-tight">
        <Link href={`/evento/${encodeURIComponent(plan.id)}`} className="hover:underline">{plan.title}</Link>
      </h2>
      <p className="mt-1 text-base text-white/95">
        {[relative(plan.date, today), plan.time, plan.place].filter(Boolean).join(" · ")}
      </p>

      {started ? (
        <p className="mt-4 rounded-2xl bg-white/20 p-3 text-center text-lg font-semibold">{plan.time ? "¡Es ahora!" : "Es hoy"}</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2" aria-live="off">
          {[
            [parts?.d, parts?.d === 1 ? "día" : "días"],
            [parts?.h, parts?.h === 1 ? "hora" : "horas"],
            [parts?.m, parts?.m === 1 ? "minuto" : "minutos"],
          ].map(([n, label]) => (
            <div key={String(label)} className="flex flex-col items-center rounded-2xl bg-white/20 py-2">
              <span className="text-3xl font-bold tabular-nums">{n === undefined ? "–" : String(n).padStart(2, "0")}</span>
              <span className="text-sm text-white/90">{label}</span>
            </div>
          ))}
        </div>
      )}

      {others != null && others > 0 && (
        <p className="mt-4 flex items-center gap-2 text-base font-medium">
          <Users size={20} aria-hidden="true" />
          {others === 1 ? "Va 1 persona más de MiMad" : `Van ${others} personas más de MiMad`}
        </p>
      )}
    </section>
  );
}

function Calendar({
  month, setMonth, today, selectedDay, onSelect, dotsFor, legend,
}: {
  month: { y: number; m: number };
  setMonth: (m: { y: number; m: number }) => void;
  today: string;
  selectedDay: string | null;
  onSelect: (d: string) => void;
  dotsFor: (d: string) => string[];
  legend: [string, string][];
}) {
  const first = new Date(Date.UTC(month.y, month.m, 1, 12));
  const days = new Date(Date.UTC(month.y, month.m + 1, 0, 12)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // semana empieza en lunes
  const isCurrent = today.slice(0, 7) === iso(month.y, month.m, 1).slice(0, 7);
  const move = (n: number) => {
    const d = new Date(Date.UTC(month.y, month.m + n, 1));
    setMonth({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  return (
    <section aria-label="Calendario" className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={isCurrent} aria-label="Mes anterior" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 disabled:opacity-40">
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <p className="text-xl font-bold" aria-live="polite">
          {MONTHS[month.m][0].toUpperCase() + MONTHS[month.m].slice(1)} {month.y}
        </p>
        <button type="button" onClick={() => move(1)} aria-label="Mes siguiente" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK_HEAD.map((d) => (
          <span key={d} className="pb-1 text-sm font-semibold text-gris" aria-hidden="true">{d}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = iso(month.y, month.m, i + 1);
          const dots = date >= today ? dotsFor(date) : [];
          const isToday = date === today;
          const isSel = date === selectedDay;
          const past = date < today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              disabled={past}
              aria-pressed={isSel}
              aria-label={`${longDay(date)}${dots.length ? ", con planes" : ""}`}
              className={`mx-auto flex h-12 w-11 flex-col items-center justify-center rounded-2xl text-lg ${
                isSel ? "bg-degradado font-bold text-white" : isToday ? "border-2 border-coral font-bold text-coral-texto" : past ? "text-slate-300" : ""
              }`}
            >
              {i + 1}
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {dots.map((c, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: isSel ? "#fff" : c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {legend.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm text-gris">
          {legend.map(([label, color]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Una fila de la lista: fecha a la izquierda y tarjeta con el color del tipo de plan
function PlanRow({ plan: p, color, canLeave }: { plan: AgendaPlan; color: string; canLeave: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const Icon = categoryInfo(p.category).icon;
  const d = new Date(`${p.date}T12:00:00Z`);
  const directions = p.lat != null && p.lon != null ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: `${p.lat},${p.lon}`, travelmode: "walking" })}` : null;

  return (
    <article className="flex gap-3">
      <div className="flex w-12 shrink-0 flex-col items-center pt-2">
        <span className="text-2xl font-bold leading-none">{d.getUTCDate()}</span>
        <span className="text-sm font-semibold text-gris">{WEEKDAYS_SHORT[d.getUTCDay()]}</span>
        <span className="mt-2 w-px flex-1 bg-slate-200" aria-hidden="true" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} aria-hidden="true" />
        <div className="flex gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }} aria-hidden="true">
            <Icon size={26} />
          </span>
          <div className="min-w-0">
            <h4 className="text-lg font-bold leading-snug">
              <Link href={`/evento/${encodeURIComponent(p.id)}`} className="hover:underline">{p.title}</Link>
            </h4>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gris">
              {p.time && (
                <span className="flex items-center gap-1"><Clock size={14} aria-hidden="true" /> {p.time}</span>
              )}
              {p.place && (
                <span className="flex min-w-0 items-center gap-1"><MapPin size={14} className="shrink-0" aria-hidden="true" /> <span className="truncate">{p.place}</span></span>
              )}
              {p.weekly && (
                <span className="flex items-center gap-1"><Repeat size={14} aria-hidden="true" /> Cada semana</span>
              )}
            </p>
          </div>
        </div>

        {p.overlaps && (
          <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> Coincide con otro plan de la agenda
          </p>
        )}

        {confirm ? (
          <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
            <p className="text-base">¿Seguro que ya no vas?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await leaveEvent(p.id);
                    router.refresh();
                  })
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-tinta font-medium text-white disabled:opacity-60"
              >
                {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />} Sí, quitarlo
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="h-11 rounded-xl border border-slate-300 bg-white font-medium">
                No, mantener
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {canLeave ? (
              <button type="button" onClick={() => setConfirm(true)} className="h-11 rounded-xl border border-slate-300 text-base font-medium">
                Ya no voy
              </button>
            ) : (
              <Link href={`/evento/${encodeURIComponent(p.id)}`} className="flex h-11 items-center justify-center rounded-xl border border-slate-300 text-base font-medium">
                Ver plan
              </Link>
            )}
            {directions ? (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-base font-medium">
                <Route size={18} aria-hidden="true" /> Cómo llegar
                <span className="sr-only">(se abre Google Maps)</span>
              </a>
            ) : (
              <span className="flex h-11 items-center justify-center rounded-xl bg-slate-50 text-sm text-gris">Sin ubicación</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
