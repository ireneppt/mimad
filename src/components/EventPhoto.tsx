"use client";

// La foto de EventImage. Si no carga (enlace roto en la web de origen), en vez del
// icono de imagen rota se pinta el degradado de la marca con el icono del tipo de plan.
import { useState } from "react";
import { categoryInfo } from "@/lib/categories";

export default function EventPhoto({
  src, categoria, iconSize, credit,
}: {
  src: string;
  categoria: string | null;
  iconSize: number;
  credit?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
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
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {credit && (
        <span className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[11px] text-white">{credit}</span>
      )}
    </>
  );
}
