// Portada de un plan: su foto (Agenda turística o la que sube la entidad) o, si no tiene
// (o no carga), una de las fotos de su tipo de plan (varias por interés, en public/fotos-por-tipo/).
import type { ReactNode } from "react";
import { categoryPhoto } from "@/lib/categoryPhotos";
import EventPhoto from "./EventPhoto";

export default function EventImage({
  src, categoria, title, fallback, className = "", iconSize = 56, children, credit,
}: {
  src?: string | null;
  categoria: string | null;
  title?: string | null; // elige cuál de las fotos del tipo (siempre la misma para cada plan)
  fallback?: string; // foto por defecto ya elegida (en las listas, para no repetir la de al lado)
  className?: string; // tamaño y bordes (p. ej. "h-36" o "h-14 w-14 rounded-xl")
  iconSize?: number; // icono si ni la foto del tipo carga
  children?: ReactNode; // etiquetas encima de la imagen
  credit?: string | null; // "Foto: esmadrid.com"
}) {
  const typePhoto = fallback || categoryPhoto(categoria, title);
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {/* La foto va aparte (componente de navegador) para poder detectar si no carga */}
      <EventPhoto
        key={src || typePhoto}
        src={src || typePhoto}
        fallback={src ? typePhoto : undefined}
        categoria={categoria}
        iconSize={iconSize}
        credit={src ? credit : null}
      />
      {children}
    </div>
  );
}

// Quién firma la foto según de dónde viene
export function photoCredit(fuente: string): string | null {
  if (fuente === "agenda_turismo" || fuente === "agenda_madrid") return "Foto: esmadrid.com";
  return null;
}
