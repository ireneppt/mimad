"use client";

// La foto de EventImage. Si no carga (enlace roto en la web de origen), se pone la foto
// de su tipo de plan; y si tampoco carga, el degradado de la marca con el icono del tipo.
import { useState } from "react";
import { categoryInfo } from "@/lib/categories";

export default function EventPhoto({
  src, fallback, categoria, iconSize, credit,
}: {
  src: string;
  fallback?: string; // foto del tipo de plan, si src es la foto propia
  categoria: string | null;
  iconSize: number;
  credit?: string | null;
}) {
  // 0 = foto propia, 1 = foto del tipo, 2 = ninguna carga
  const [stage, setStage] = useState(0);
  const current = stage === 0 ? src : stage === 1 ? fallback : undefined;
  if (!current) {
    const { icon: Icon } = categoryInfo(categoria);
    return (
      <span className="bg-degradado absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <Icon size={iconSize} className="text-white/90" />
      </span>
    );
  }
  return (
    <>
      {/* Fotos de otras webs (esmadrid.com) o ya reducidas en el móvil: sin optimizador */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setStage((s) => (s === 0 && fallback ? 1 : 2))}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {stage === 0 && credit && (
        <span className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[11px] text-white">{credit}</span>
      )}
    </>
  );
}
