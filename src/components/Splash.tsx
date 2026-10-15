"use client";

// Animación de apertura: se dibuja la "M" del logo, late el corazón y aparece el nombre.
// Sale una vez por sesión. Un script en el layout la oculta antes de pintar si ya se vio,
// para que no parpadee. Las animaciones están en globals.css (clases splash-*).
// Se puede repetir en cualquier momento con playSplash() (p. ej. al crear la cuenta).
import { useEffect, useState } from "react";

export const SPLASH_KEY = "mm_splash_visto";
const REPLAY_EVENT = "mm:splash";
export const SPLASH_DURATION_MS = 2350;

export function playSplash() {
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

export default function Splash() {
  const [gone, setGone] = useState(false);
  const [run, setRun] = useState(0); // cambia la "key" para reiniciar las animaciones

  useEffect(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {}

    const replay = () => {
      document.documentElement.classList.remove("sin-splash");
      setGone(false);
      setRun((r) => r + 1);
    };
    window.addEventListener(REPLAY_EVENT, replay);
    return () => window.removeEventListener(REPLAY_EVENT, replay);
  }, []);

  if (gone) return null;

  return (
    <div
      key={run}
      id="splash"
      aria-hidden="true"
      onAnimationEnd={(e) => e.animationName === "splash-salida" && setGone(true)}
      className="splash fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-crema to-white"
    >
      <svg viewBox="0 0 512 512" width="150" height="150" className="splash-logo">
        <defs>
          <linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFC233" />
            <stop offset="1" stopColor="#FF4F6D" />
          </linearGradient>
        </defs>
        <circle cx="256" cy="256" r="256" fill="url(#splash-g)" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round">
          <path className="splash-trazo" pathLength={1} d="M164 392 V238 L256 322 L348 238 V392" />
          <path className="splash-trazo splash-brazo" pathLength={1} d="M164 262 L100 212" />
          <path className="splash-trazo splash-brazo" pathLength={1} d="M348 262 L412 212" />
        </g>
        <circle className="splash-cabeza" cx="164" cy="160" r="40" fill="#FFFFFF" />
        <circle className="splash-cabeza" cx="348" cy="160" r="40" fill="#FFFFFF" />
        <path
          className="splash-corazon"
          d="M256 272 C218 244 214 210 236 202 C248 198 256 208 256 214 C256 208 264 198 276 202 C298 210 294 244 256 272Z"
          fill="#FFF3B0"
        />
      </svg>
      <p className="splash-nombre text-5xl font-bold tracking-tight text-tinta">
        Mi<span className="text-coral-texto">Mad</span>
      </p>
      <p className="splash-lema text-xl text-gris">Madrid, mejor en compañía.</p>
    </div>
  );
}
