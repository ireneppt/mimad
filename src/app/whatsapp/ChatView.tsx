"use client";

// Pantalla que imita el chat de WhatsApp con el bot de MiMad. Pinta los mensajes del bot
// y, al tocar un botón, pide la respuesta al servidor (pressButton) y la añade al chat.
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, CheckCheck, ChevronLeft, Info } from "lucide-react";
import EventImage from "@/components/EventImage";
import type { BotButton, BotMessage } from "@/lib/bot/tipos";
import { pressButton } from "./actions";

type Entry =
  | { from: "bot"; msg: BotMessage; time: string; answered: boolean }
  | { from: "me"; id: string; text: string; time: string };

const nowTime = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// "*negrita*" de WhatsApp y saltos de línea → texto con <strong>
function WaText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/\*([^*]+)\*/g).map((part, j) => (j % 2 ? <strong key={j}>{part}</strong> : part))}
        </Fragment>
      ))}
    </>
  );
}

export default function ChatView({ initial, startTime, backHref }: { initial: BotMessage[]; startTime: string; backHref: string }) {
  const [entries, setEntries] = useState<Entry[]>(() => initial.map((msg) => ({ from: "bot", msg, time: startTime, answered: false })));
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Cada mensaje nuevo: se baja al final del chat
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, pending]);

  function tap(msgId: string, button: Extract<BotButton, { kind: "reply" }>) {
    const time = nowTime();
    // El mensaje queda respondido (sus botones se desactivan) y sale lo que ha tocado
    setEntries((list) => [
      ...list.map((e) => (e.from === "bot" && e.msg.id === msgId ? { ...e, answered: true } : e)),
      { from: "me", id: `yo:${Date.now()}`, text: button.label, time },
    ]);
    startTransition(async () => {
      let replies: BotMessage[];
      try {
        replies = await pressButton(button.id);
      } catch {
        replies = [{ id: `error:${Date.now()}`, text: "Perdona, no hemos podido hacerlo. Inténtalo otra vez.", buttons: [] }];
      }
      setEntries((list) => [...list, ...replies.map((msg) => ({ from: "bot" as const, msg, time: nowTime(), answered: false }))]);
    });
  }

  return (
    <div className="flex h-dvh flex-col bg-[#efe7de]">
      {/* Cabecera como la de un chat de empresa en WhatsApp */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3">
        <Link href={backHref} className="flex h-11 w-11 items-center justify-center rounded-full text-blue-700" aria-label="Volver a MiMad">
          <ChevronLeft size={30} aria-hidden="true" />
        </Link>
        <Image src="/icono.svg" alt="" width={48} height={48} />
        <div className="leading-tight">
          <p className="flex items-center gap-1.5 text-xl font-bold">
            MiMad <BadgeCheck size={22} className="fill-green-600 text-white" aria-label="Cuenta verificada" />
          </p>
          <p className="text-base text-gris">Cuenta de empresa</p>
        </div>
      </header>

      {/* Que se vea bien que no es WhatsApp de verdad */}
      <p role="note" className="flex items-start gap-2 border-b-2 border-amber-300 bg-amber-100 px-4 py-3 text-base font-semibold text-amber-950">
        <Info size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
        Simulación: en producción esto llegaría por WhatsApp.
      </p>

      <div role="log" aria-live="polite" aria-label="Conversación con el bot de MiMad" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-2">
          <p className="mx-auto mb-2 rounded-lg bg-sky-100 px-3 py-1 text-sm font-medium text-slate-700">Hoy</p>

          {entries.map((e) =>
            e.from === "me" ? (
              <div key={e.id} className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-2 text-lg shadow-sm">
                {e.text}
                <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-600">
                  {e.time} <CheckCheck size={16} className="text-sky-600" aria-label="Leído" />
                </span>
              </div>
            ) : (
              <div key={e.msg.id} className="flex max-w-[88%] flex-col gap-1.5">
                <div className="rounded-2xl rounded-tl-sm bg-white p-2 shadow-sm">
                  {e.msg.card && (
                    <EventImage src={e.msg.card.imagen} categoria={e.msg.card.categoria} className="mb-1 h-32 rounded-xl" iconSize={48} />
                  )}
                  <p className="px-2 pt-1 text-lg leading-snug">
                    <WaText text={e.msg.text} />
                  </p>
                  <span className="block px-2 text-right text-xs text-slate-600">{e.time}</span>
                </div>
                {e.msg.buttons.map((b) =>
                  b.kind === "url" ? (
                    b.url.startsWith("/") ? (
                      <Link key={b.label} href={b.url} className={buttonClass(false)}>
                        {b.label}
                      </Link>
                    ) : (
                      <a key={b.label} href={b.url} target="_blank" rel="noopener noreferrer" className={buttonClass(false)}>
                        {b.label}
                        <span className="sr-only"> (se abre Google Maps)</span>
                      </a>
                    )
                  ) : (
                    <button
                      key={b.id}
                      type="button"
                      disabled={e.answered || pending}
                      onClick={() => tap(e.msg.id, b)}
                      className={buttonClass(e.answered)}
                    >
                      {b.label}
                    </button>
                  )
                )}
              </div>
            )
          )}

          {pending && (
            <p className="w-fit rounded-2xl rounded-tl-sm bg-white px-4 py-2 text-lg italic text-slate-600 shadow-sm" aria-live="polite">
              MiMad está escribiendo…
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Como en el bot real: se responde con los botones, no escribiendo */}
      <div className="border-t border-slate-200 bg-slate-50 p-3">
        <input
          type="text"
          disabled
          placeholder="Toca un botón para responder"
          aria-label="Escribir mensaje (desactivado: toca un botón para responder)"
          className="h-12 w-full rounded-full border border-slate-300 bg-white px-5 text-lg placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

function buttonClass(answered: boolean) {
  return `flex min-h-12 items-center justify-center rounded-xl bg-white px-4 py-2 text-lg font-semibold shadow-sm ${
    answered ? "text-slate-400" : "text-blue-700 active:bg-slate-100"
  }`;
}
