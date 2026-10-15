// "Fuente: <dataset> · <organismo>" con enlace a la ficha de datos abiertos.
// Requisito del reto: toda la información muestra de dónde viene.
import { Database } from "lucide-react";
import type { Fuente } from "@/lib/data";

export default function SourceTag({
  fuente, label, className = "",
}: {
  fuente?: Fuente;
  label?: string; // para fuentes que no están en da_fuentes (p. ej. eventos de entidades)
  className?: string;
}) {
  const text = fuente ? `${fuente.nombre} · ${fuente.organismo}` : label;
  if (!text) return null;

  const content = (
    <>
      <Database size={14} className="shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">Fuente:</span> {text}
      </span>
    </>
  );
  const cls = `flex items-start gap-1.5 text-sm text-gris ${className}`;

  return fuente ? (
    <a href={fuente.url_ficha} target="_blank" rel="noopener noreferrer" className={`${cls} hover:underline`}>
      {content}
      <span className="sr-only">(abre la ficha del dataset en otra pestaña)</span>
    </a>
  ) : (
    <p className={cls}>{content}</p>
  );
}
