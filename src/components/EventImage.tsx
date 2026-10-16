// Portada de un plan: su foto (Agenda turística o la que sube la entidad) o, si no tiene,
// el degradado de la marca con el icono de su tipo.
import type { ReactNode } from "react";
import { categoryInfo } from "@/lib/categories";

export default function EventImage({
  src, categoria, className = "", iconSize = 56, children, credit,
}: {
  src?: string | null;
  categoria: string | null;
  className?: string; // tamaño y bordes (p. ej. "h-36" o "h-14 w-14 rounded-xl")
  iconSize?: number;
  children?: ReactNode; // etiquetas encima de la imagen
  credit?: string | null; // "Foto: esmadrid.com"
}) {
  const { icon: Icon } = categoryInfo(categoria);
  return (
    <div className={`relative overflow-hidden ${src ? "bg-slate-100" : "bg-degradado"} ${className}`}>
      {src ? (
        // Fotos de otras webs (esmadrid.com) o ya reducidas en el móvil: sin optimizador
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Icon size={iconSize} className="text-white/90" />
        </span>
      )}
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
