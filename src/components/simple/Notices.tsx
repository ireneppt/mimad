"use client";

// Avisos dentro de la app (versión simplificada):
//   - NoticesProvider: pide los avisos al abrir la app, al cambiar de pantalla, cada minuto y al
//     volver a la app; cuenta los nuevos y saca el aviso emergente arriba unos segundos.
//   - NoticesBell: la campana con el número de avisos nuevos (en la cabecera de SimpleShell).
// Los avisos se calculan en el servidor según la hora (lib/bot/mensajes.ts: getAppNotices).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, CalendarClock, Heart, X } from "lucide-react";
import { getSimpleNotices } from "@/app/simple/avisos/actions";
import type { AppNotice } from "@/lib/bot/mensajes";

const SEEN_KEY = "mm_avisos_vistos"; // avisos ya vistos en la lista (la campana no los cuenta)
const POPPED_KEY = "mm_avisos_emergentes"; // avisos que ya han salido emergentes (solo una vez)
const SHOW_MS = 6000;
const CHECK_EVERY_MS = 60_000;
const NO_NOTICES_ON = ["/simple/login", "/simple/registro"];

function readIds(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}
function addIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set([...readIds(key), ...ids])].slice(-300)));
  } catch {}
}

type Ctx = { enabled: boolean; items: AppNotice[]; unseen: number; markAllSeen: () => void; refresh: () => void };
const NoticesContext = createContext<Ctx | null>(null);
export const useNotices = () => useContext(NoticesContext);

// "*Lucía te recomienda:* Taller…" → partes con negrita
export function NoticeText({ text }: { text: string }) {
  return <>{text.split(/\*([^*]+)\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}</>;
}

export function NoticeIcon({ kind, size = 28 }: { kind: AppNotice["kind"]; size?: number }) {
  return kind === "recomendacion" ? (
    <Heart size={size} className="text-coral-texto" aria-hidden="true" />
  ) : (
    <CalendarClock size={size} className="text-blue-700" aria-hidden="true" />
  );
}

export function NoticesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const off = NO_NOTICES_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [data, setData] = useState<{ enabled: boolean; items: AppNotice[] } | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<AppNotice | null>(null);
  const [top, setTop] = useState(8);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (off || busy.current) return;
    busy.current = true;
    try {
      const d = await getSimpleNotices().catch(() => null);
      setData(d);
      setSeen(readIds(SEEN_KEY));
      if (!d?.enabled) return;
      // Aviso emergente: el más nuevo que todavía no ha salido (y que no se ha visto en la lista)
      const popped = readIds(POPPED_KEY);
      const seenNow = readIds(SEEN_KEY);
      const fresh = d.items.find((n) => !popped.has(n.id) && !seenNow.has(n.id));
      addIds(POPPED_KEY, d.items.map((n) => n.id));
      if (fresh && pathname !== "/simple/avisos") {
        // Si está la notificación simulada de WhatsApp, el aviso va justo debajo
        const wa = document.querySelector("[data-wa-notice]")?.getBoundingClientRect();
        setTop(wa ? wa.bottom + 8 : 8);
        setPopup(fresh);
      }
    } finally {
      busy.current = false;
    }
  }, [off, pathname]);

  useEffect(() => {
    const t = setTimeout(refresh, 800);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    const interval = setInterval(refresh, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // El aviso emergente se va solo a los pocos segundos
  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [popup]);

  const markAllSeen = useCallback(() => {
    if (!data) return;
    addIds(SEEN_KEY, data.items.map((n) => n.id));
    setSeen(readIds(SEEN_KEY));
    setPopup(null);
  }, [data]);

  const items = data?.items ?? [];
  const ctx: Ctx = {
    enabled: !!data?.enabled,
    items,
    unseen: items.filter((n) => !seen.has(n.id)).length,
    markAllSeen,
    refresh,
  };

  return (
    <NoticesContext.Provider value={ctx}>
      {children}
      {popup && !off && (
        <div role="status" style={{ top }} className="aviso-entrada fixed inset-x-0 z-50 mx-auto w-[min(414px,calc(100%-16px))]">
          <div className="relative rounded-3xl border-2 border-slate-300 bg-white shadow-xl">
            <Link href="/simple/avisos" onClick={() => setPopup(null)} className="flex items-start gap-3 p-4 pr-14">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-crema">
                <NoticeIcon kind={popup.kind} />
              </span>
              <span className="text-xl leading-snug">
                <span className="block text-base font-semibold text-gris">MiMad · Aviso nuevo</span>
                <NoticeText text={popup.text} />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setPopup(null)}
              aria-label="Cerrar aviso"
              className="absolute right-2 top-2 flex h-12 w-12 items-center justify-center rounded-full text-gris"
            >
              <X size={26} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </NoticesContext.Provider>
  );
}

// Campana de la cabecera: con un número si hay avisos nuevos. Solo si los avisos están activados.
export function NoticesBell() {
  const ctx = useNotices();
  if (!ctx?.enabled) return null;
  const n = ctx.unseen;
  return (
    <Link
      href="/simple/avisos"
      aria-label={n ? `Mis avisos: ${n} ${n === 1 ? "nuevo" : "nuevos"}` : "Mis avisos"}
      className="relative ml-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-500 bg-white"
    >
      <Bell size={32} aria-hidden="true" />
      {n > 0 && (
        <span className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-red-700 px-1.5 text-lg font-bold text-white" aria-hidden="true">
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}
