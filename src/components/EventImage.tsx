// Portada de un plan: su foto (Agenda turística o la que sube la entidad) o, si no tiene,
// la foto de su tipo de plan (una por interés, en public/fotos-por-tipo/).
import type { ReactNode } from "react";
import { categoryPhoto } from "@/lib/categoryPhotos";

export default function EventImage({
  src, categoria, className = "", children, credit,
}: {
  src?: string | null;
  categoria: string | null;
  className?: string; // tamaño y bordes (p. ej. "h-36" o "h-14 w-14 rounded-xl")
  iconSize?: number; // (ya no se usa: antes se dibujaba el icono)
  children?: ReactNode; // etiquetas encima de la imagen
  credit?: string | null; // "Foto: esmadrid.com"
}) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {/* Fotos de otras webs (esmadrid.com), ya reducidas en el móvil o de la app: sin optimizador */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src || categoryPhoto(categoria)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      {children}
      {src && credit && (
        <span className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[11px] text-white">{credit}</span>
      )}
    </div>
  );
}

// Quién firma la foto según de dónde viene
export function photoCredit(fuente: string): string | null {
  if (fuente === "agenda_turismo" || fuente === "agenda_madrid") return "Foto: esmadrid.com";
  return null;
}
