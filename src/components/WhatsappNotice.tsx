"use client";

// Notificación simulada de WhatsApp (versión simplificada y normal): cuando llega un mensaje
// nuevo del bot (al apuntarse a un plan, 24 horas antes, una recomendación…) baja un aviso
// arriba; al tocarlo se abre el chat simulado (/whatsapp).
// Forma parte del canal simulado del bot (ver lib/bot/canal.ts): no envía nada fuera de la app.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { getWhatsappNotice, type NoticeItem } from "@/app/whatsapp/actions";

// Las pantallas que apuntan a un plan sin cambiar de dirección lanzan este evento
// para que el aviso de "te has apuntado" llegue al momento
export const BOT_UPDATE_EVENT = "mm:bot";
export const announceBotUpdate = () => window.dispatchEvent(new Event(BOT_UPDATE_EVENT));

const SEEN_KEY = "mm_whatsapp_vistos"; // ids de mensajes ya vistos en este móvil
const CHECK_EVERY_MS = 60_000; // para que el recordatorio de 24 horas llegue con la app abierta
const NO_NOTICE_ON = ["/login", "/registro", "/simple/login", "/simple/registro", "/privacidad"];

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function markSeen(ids: string[]) {
  try {
    const all = [...new Set([...readSeen(), ...ids])].slice(-300);
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {}
}

export default function WhatsappNotice() {
  const pathname = usePathname();
  const search = useSearchParams().toString(); // p. ej. "?hecho=…" tras "Me apunto"
  const [notice, setNotice] = useState<{ latest: NoticeItem; more: number; ids: string[] } | null>(null);
  const busy = useRef(false);
  const inChat = pathname === "/whatsapp";
  const off = NO_NOTICE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const check = useCallback(async () => {
    if (off || busy.current) return;
    busy.current = true;
    try {
      const items = await getWhatsappNotice().catch(() => null);
      if (!items) return setNotice(null);
      // En el chat ya se están viendo: cuentan como vistos
      if (inChat) {
        markSeen(items.map((i) => i.id));
        return setNotice(null);
      }
      const seen = readSeen();
      const unseen = items.filter((i) => !seen.has(i.id));
      setNotice(unseen.length ? { latest: unseen[unseen.length - 1], more: unseen.length - 1, ids: items.map((i) => i.id) } : null);
    } finally {
      busy.current = false;
    }
  }, [off, inChat]);

  // Al cambiar de pantalla (y al entrar en la app, tras la animación de apertura)
  useEffect(() => {
    const t = setTimeout(check, 1500);
    return () => clearTimeout(t);
  }, [check, pathname, search]);

  // Cada minuto, al volver a la app y justo después de apuntarse
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && check();
    const interval = setInterval(check, CHECK_EVERY_MS);
    window.addEventListener(BOT_UPDATE_EVENT, check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener(BOT_UPDATE_EVENT, check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  function dismiss() {
    if (notice) markSeen(notice.ids);
    setNotice(null);
  }

  if (!notice || off || inChat) return null;

  return (
    // data-wa-notice: los avisos de la app (components/simple/Notices.tsx) se colocan debajo
    <div role="status" data-wa-notice className="aviso-entrada fixed inset-x-0 top-2 z-50 mx-auto w-[min(414px,calc(100%-16px))]">
      <div className="relative rounded-3xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
        <Link href="/whatsapp" onClick={dismiss} className="flex gap-3 p-4 pr-14">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white" aria-hidden="true">
            <MessageCircle size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm text-gris">
              <span className="font-semibold text-tinta">WhatsApp</span> · ahora
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-950">Simulación</span>
            </span>
            <span className="block text-lg font-bold leading-tight">MiMad</span>
            <span className="line-clamp-2 text-base leading-snug">{notice.latest.preview}</span>
            {notice.more > 0 && (
              <span className="block text-sm text-gris">
                +{notice.more} {notice.more === 1 ? "mensaje más" : "mensajes más"}
              </span>
            )}
            <span className="sr-only">Toca para abrir el chat con el bot de MiMad (simulación).</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-gris hover:bg-slate-100"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
