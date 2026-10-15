"use client";

// Estructura común de las pantallas de la versión simplificada (diseños simplificada-*.png):
// botón "Versión por defecto", "Escuchar las instrucciones", "Necesito ayuda" y la barra de pasos.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleHelp, Volume2, VolumeX } from "lucide-react";

type Props = {
  defaultHref: string; // la misma pantalla en la versión por defecto
  step?: number;
  total?: number;
  title: string;
  intro?: ReactNode;
  help: ReactNode; // instrucciones de "Necesito ayuda" para esta pantalla
  children: ReactNode;
};

export default function SimpleShell({ defaultHref, step, total, title, intro, help, children }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const firstRender = useRef(true);

  // Al cambiar de paso: se para la voz, se sube arriba y el foco va al título (lectores de pantalla)
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step, title]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // Lee en voz alta el título y la explicación con la voz del navegador (sin coste ni claves)
  function toggleSpeech() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = [headingRef.current?.textContent, introRef.current?.textContent].filter(Boolean).join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  function toggleHelp() {
    const open = !helpOpen;
    setHelpOpen(open);
    if (open) setTimeout(() => helpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  const toolClass =
    "flex min-h-16 flex-1 items-center gap-3 rounded-2xl border-2 border-slate-500 bg-slate-100 px-4 py-2 text-left text-lg font-semibold leading-tight";

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-5 pb-12 pt-6 text-tinta">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Image src="/icono.svg" alt="" width={56} height={56} priority />
          <div>
            <p className="text-2xl font-bold leading-tight">MiMad</p>
            <p className="text-lg text-gris">Versión simplificada</p>
          </div>
        </div>
        <Link
          href={defaultHref}
          className="flex h-14 items-center justify-center rounded-2xl border-2 border-slate-500 text-lg font-medium"
        >
          Versión por defecto
        </Link>
        <div className="flex gap-3">
          <button type="button" onClick={toggleSpeech} className={toolClass} aria-pressed={speaking}>
            {speaking ? <VolumeX size={28} aria-hidden="true" /> : <Volume2 size={28} aria-hidden="true" />}
            {speaking ? "Parar la voz" : "Escuchar las instrucciones"}
          </button>
          <button type="button" onClick={toggleHelp} className={toolClass} aria-expanded={helpOpen} aria-controls="ayuda">
            <CircleHelp size={28} aria-hidden="true" />
            Necesito ayuda
          </button>
        </div>
      </header>

      {step && total && (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">
            Paso {step} de {total}
          </p>
          <div className="flex gap-2" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-2.5 flex-1 rounded-full ${i < step ? "bg-degradado" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-[2rem] font-bold leading-tight focus:outline-none">
          {title}
        </h1>
        {intro && (
          <div ref={introRef} className="text-xl leading-relaxed text-gris [&_strong]:font-bold [&_strong]:text-tinta">
            {intro}
          </div>
        )}
      </div>

      {children}

      {helpOpen && (
        <div
          id="ayuda"
          ref={helpRef}
          className="scroll-mt-4 rounded-2xl border-2 border-blue-700 bg-blue-50 p-5 text-xl leading-relaxed [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_strong]:font-bold"
        >
          <h2 className="mb-3 text-2xl font-bold">Cómo hacerlo, paso a paso</h2>
          {help}
          <p className="mt-3">
            Si te equivocas, no pasa nada: puedes volver atrás en cualquier momento. También puedes pedir a un familiar que
            te ayude.
          </p>
        </div>
      )}
    </main>
  );
}
