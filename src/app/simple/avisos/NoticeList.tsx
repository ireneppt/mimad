"use client";

// Los avisos, uno debajo de otro, con sus botones. Los botones hacen lo mismo que en el
// WhatsApp simulado (lib/bot/botones.ts) y responden con una frase corta.
import { useEffect, useState, useTransition } from "react";
import { Hint } from "@/components/simple/ui";
import { NoticeIcon, NoticeText, useNotices } from "@/components/simple/Notices";
import type { AppNotice } from "@/lib/bot/mensajes";
import { pressNotice } from "./actions";

const TZ = "Europe/Madrid";

// "Hoy, 9:00", "Ayer, 9:00" o "Jueves, 9:00"
function when(at: number): string {
  const day = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: TZ });
  const time = new Date(at).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  if (day(at) === day(Date.now())) return `Hoy, ${time}`;
  if (day(at) === day(Date.now() - 86_400_000)) return `Ayer, ${time}`;
  const wd = new Date(at).toLocaleDateString("es-ES", { timeZone: TZ, weekday: "long" });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${time}`;
}

export default function NoticeList({ notices }: { notices: AppNotice[] }) {
  const ctx = useNotices();
  const [done, setDone] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Al abrir la lista, los avisos ya cuentan como vistos (la campana se queda sin número)
  const markAllSeen = ctx?.markAllSeen;
  useEffect(() => {
    markAllSeen?.();
  }, [markAllSeen]);

  function press(notice: AppNotice, buttonId: string) {
    setBusyId(notice.id);
    startTransition(async () => {
      const r = await pressNotice(buttonId).catch(() => ({ ok: false, text: "No se ha podido hacer. Prueba otra vez." }));
      setDone((d) => ({ ...d, [notice.id]: r }));
      setBusyId(null);
      ctx?.refresh();
    });
  }

  if (notices.length === 0) {
    return <Hint tone="info">No tienes avisos. Cuando tu familia te recomiende un plan o tengas un plan cerca, te avisaremos aquí.</Hint>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {notices.map((n) => {
        const result = done[n.id];
        const locked = !!result?.ok || busyId === n.id;
        return (
          <li key={n.id} className="flex flex-col gap-4 rounded-3xl border-2 border-slate-300 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-crema">
                <NoticeIcon kind={n.kind} />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-xl leading-snug">
                  <NoticeText text={n.text} />
                </p>
                <p className="text-base text-gris">{when(n.at)}</p>
              </div>
            </div>

            {result && <Hint tone={result.ok ? "ok" : "error"}>{result.text}</Hint>}

            <div className="flex flex-col gap-3">
              {n.buttons.map((b) =>
                b.kind === "url" ? (
                  <a
                    key={b.label}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-14 items-center justify-center rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
                  >
                    {b.label}
                    <span className="sr-only"> (se abre el mapa)</span>
                  </a>
                ) : (
                  <button
                    key={b.id}
                    type="button"
                    disabled={locked}
                    onClick={() => press(n, b.id)}
                    className={
                      b.label === "Me apunto"
                        ? "bg-degradado-fuerte flex h-14 items-center justify-center rounded-2xl text-xl font-bold text-white disabled:opacity-50"
                        : "flex h-14 items-center justify-center rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold disabled:opacity-50"
                    }
                  >
                    {busyId === n.id ? "Un momento…" : b.label}
                  </button>
                )
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
