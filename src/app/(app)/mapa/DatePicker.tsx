"use client";

// Chip "Elegir fecha": abre el calendario del móvil y va al mapa de ese día
import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function DatePicker({
  value, min, baseHref, className, icon,
}: {
  value: string | null;
  min: string;
  baseHref: string;
  className: string;
  icon: ReactNode;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const label = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
    : "Elegir fecha";

  return (
    <label className={`relative cursor-pointer ${className}`}>
      {icon}
      {label}
      <input
        ref={input}
        type="date"
        min={min}
        value={value ?? ""}
        aria-label="Elegir una fecha"
        onClick={() => input.current?.showPicker?.()}
        onChange={(e) => {
          if (!e.target.value) return;
          const sep = baseHref.includes("?") ? "&" : "?";
          router.push(`${baseHref}${sep}d=${e.target.value}`, { scroll: false });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
