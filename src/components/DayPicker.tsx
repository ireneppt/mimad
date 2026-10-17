"use client";

// Botón "Elegir día" y su calendario (versión simplificada, inicio y mapa de la normal).
// El calendario se abre encima de la pantalla: mes, flechas para cambiar de mes, días en
// español (empieza en lunes), sin días pasados y con un botón para volver a "Hoy".
// Al tocar un día se va a baseHref con ?<param>=AAAA-MM-DD.
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MAX_MONTHS_AHEAD = 12;

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export default function DayPicker({
  value, today, baseHref, param, todayHref, size = "normal", className, children,
}: {
  value: string | null; // día elegido ahora (AAAA-MM-DD) o null
  today: string; // hoy en Madrid (lo da el servidor)
  baseHref: string; // dirección sin el día (con los demás filtros)
  param: string; // nombre del parámetro del día ("dia", "d")
  todayHref: string; // a dónde lleva "Volver a Hoy"
  size?: "normal" | "big"; // big: versión simplificada
  className: string; // aspecto del botón que abre el calendario
  children?: ReactNode; // texto del botón (por defecto, "Elegir día")
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [ty, tm] = today.split("-").map(Number);
  const start = value ?? today;
  const [month, setMonth] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const big = size === "big";

  // Al abrir: foco dentro del calendario. Con Esc se cierra y el foco vuelve al botón.
  useEffect(() => {
    if (!open) return;
    // Solo al abrir (no al cambiar de mes): el día elegido, hoy o, si no, el primer botón
    (dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? dialogRef.current?.querySelector<HTMLElement>("button"))?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      openerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function openCalendar() {
    setMonth({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
    setOpen(true);
  }
  function close() {
    setOpen(false);
    openerRef.current?.focus();
  }
  function go(href: string) {
    setOpen(false);
    router.push(href, { scroll: false });
  }
  const pick = (day: string) => go(`${baseHref}${baseHref.includes("?") ? "&" : "?"}${param}=${day}`);

  // Meses a los que se puede ir: desde el actual hasta dentro de un año
  const monthIndex = (y: number, m: number) => y * 12 + m;
  const canPrev = monthIndex(month.y, month.m) > monthIndex(ty, tm - 1);
  const canNext = monthIndex(month.y, month.m) < monthIndex(ty, tm - 1) + MAX_MONTHS_AHEAD;
  const shift = (n: number) => setMonth(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));

  // Huecos antes del día 1 (la semana empieza en lunes)
  const firstWeekday = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const cellSize = big ? "h-14 text-2xl" : "h-11 text-lg";
  const navBtn = `flex shrink-0 items-center justify-center rounded-full border-2 border-slate-500 bg-white disabled:border-slate-200 disabled:text-slate-300 ${big ? "h-14 w-14" : "h-11 w-11"}`;

  return (
    <>
      <button ref={openerRef} type="button" onClick={openCalendar} aria-haspopup="dialog" className={className}>
        {children ?? (
          <>
            <CalendarDays size={big ? 26 : 18} aria-hidden="true" /> Elegir día
          </>
        )}
      </button>

      {/* Se dibuja en <body> (portal): así queda encima de todo, también de los controles del mapa */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/45 sm:items-center" onClick={close}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[430px] rounded-t-3xl bg-white p-5 text-tinta shadow-2xl sm:rounded-3xl ${big ? "pb-8" : ""}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id={titleId} className={`font-bold ${big ? "text-[1.75rem]" : "text-xl"}`}>
                Elige un día
              </h2>
              <button type="button" onClick={close} aria-label="Cerrar el calendario" className={`${navBtn} border-transparent`}>
                <X size={big ? 30 : 22} aria-hidden="true" />
              </button>
            </div>

            {/* Mes y flechas */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Mes anterior" className={navBtn}>
                <ChevronLeft size={big ? 32 : 24} aria-hidden="true" />
              </button>
              <p className={`font-bold capitalize ${big ? "text-2xl" : "text-lg"}`} aria-live="polite">
                {MONTHS[month.m]} {month.y}
              </p>
              <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Mes siguiente" className={navBtn}>
                <ChevronRight size={big ? 32 : 24} aria-hidden="true" />
              </button>
            </div>

            {/* Días de la semana y del mes */}
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS_SHORT.map((w) => (
                <span key={w} className={`text-center font-bold text-gris ${big ? "text-xl" : "text-sm"}`} aria-hidden="true">
                  {w}
                </span>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <span key={`hueco-${i}`} />;
                const day = iso(month.y, month.m, d);
                const past = day < today;
                const selected = day === value;
                const isToday = day === today;
                const weekday = WEEKDAYS_LONG[new Date(Date.UTC(month.y, month.m, d)).getUTCDay()];
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={past}
                    onClick={() => pick(day)}
                    data-autofocus={selected || (!value && isToday) ? "" : undefined}
                    aria-label={`${weekday} ${d} de ${MONTHS[month.m]}${isToday ? ", hoy" : ""}${past ? ", ya ha pasado" : ""}`}
                    aria-pressed={selected}
                    className={`${cellSize} flex items-center justify-center rounded-xl font-semibold ${
                      past
                        ? "text-slate-300"
                        : selected
                          ? "bg-tinta text-white"
                          : isToday
                            ? "border-2 border-coral-texto text-coral-texto"
                            : "hover:bg-slate-100"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => go(todayHref)}
              className={`mt-5 flex w-full items-center justify-center rounded-2xl border-2 border-slate-500 bg-white font-semibold ${big ? "h-16 text-xl" : "h-12 text-base"}`}
            >
              Volver a Hoy
            </button>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
