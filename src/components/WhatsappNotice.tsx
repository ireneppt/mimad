"use client";

// Notificación simulada de WhatsApp: estando en cualquier pantalla de la app, baja un aviso
// con el primer mensaje del bot de MiMad; al tocarlo se abre el chat simulado (/whatsapp).
// Forma parte del canal simulado del bot (ver lib/bot/canal.ts): no envía nada fuera de la app.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { getWhatsappNotice, type WhatsappNotice as Notice } from "@/app/whatsapp/actions";

const SEEN_KEY = "mm_aviso_whatsapp_visto"; // una vez por sesión y por conjunto de avisos
const DELAY_MS = 3000; // después de la animación de apertura
const HIDDEN_ON = ["/whatsapp", "/login", "/registro", "/simple/login", "/simple/registro", "/privacidad"];

export default function WhatsappNotice() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);
  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Se pregunta una sola vez, en la primera pantalla donde puede salir (p. ej. justo después
  // de entrar desde el login). El aviso sigue aunque se cambie de pantalla.
  const asked = useRef(false);
  useEffect(() => {
    if (hiddenHere || asked.current) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      asked.current = true;
      const n = await getWhatsappNotice().catch(() => null);
      let seen: string | null = null;
      try {
        seen = sessionStorage.getItem(SEEN_KEY);
      } catch {}
      if (!cancelled && n && n.signature !== seen) setNotice(n);
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [hiddenHere]);

  function dismiss() {
    try {
      if (notice) sessionStorage.setItem(SEEN_KEY, notice.signature);
    } catch {}
    setNotice(null);
  }

  if (!notice || hiddenHere) return null;

  return (
    <div role="status" className="aviso-entrada fixed inset-x-0 top-2 z-50 mx-auto w-[min(414px,calc(100%-16px))]">
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
            <span className="block text-lg font-bold leading-tight">{notice.title}</span>
            <span className="line-clamp-2 text-base leading-snug">{notice.body}</span>
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
