"use client";

// Piezas de formulario de la versión simplificada: letra y botones grandes, alto contraste.
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, Info, LoaderCircle } from "lucide-react";

export const bigInputClass =
  "h-16 w-full rounded-2xl border-2 border-slate-500 bg-white px-5 text-2xl text-tinta placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700";

export function BigLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xl font-bold">
      {children}
    </label>
  );
}

export function BigInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${bigInputClass} ${props.className ?? ""}`} />;
}

export function BigPhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex h-16 overflow-hidden rounded-2xl border-2 border-slate-500 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-700">
      <span className="flex items-center border-r-2 border-slate-300 bg-slate-100 px-4 text-2xl font-semibold" aria-hidden="true">
        +34
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        {...props}
        className="w-full px-5 text-2xl tracking-wide placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

// Contraseña con un botón grande "Mostrar la contraseña" debajo (como en los diseños)
export function BigPassword({ visible, onToggle, ...props }: InputHTMLAttributes<HTMLInputElement> & { visible: boolean; onToggle?: () => void }) {
  return (
    <>
      <BigInput {...props} type={visible ? "text" : "password"} />
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={visible}
          className="flex h-14 items-center gap-3 rounded-2xl border-2 border-slate-500 px-5 text-xl font-semibold"
        >
          {visible ? <EyeOff size={26} aria-hidden="true" /> : <Eye size={26} aria-hidden="true" />}
          {visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        </button>
      )}
    </>
  );
}

// Mensaje bajo el campo: verde si va bien, gris informativo o rojo si hay que corregir algo
export function Hint({ tone, children }: { tone: "ok" | "info" | "error"; children: ReactNode }) {
  const styles = {
    ok: "bg-green-50 text-green-800",
    info: "bg-slate-100 text-tinta",
    error: "bg-red-50 text-red-800",
  }[tone];
  const Icon = tone === "error" ? CircleAlert : Info;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-2xl p-4 text-xl leading-snug ${styles}`}>
      <Icon size={26} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const primaryClass =
  "bg-degradado-fuerte flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-2xl font-bold text-white shadow-lg shadow-coral/30 disabled:opacity-70";

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={primaryClass}>
      {children}
      <ArrowRight size={28} aria-hidden="true" />
    </button>
  );
}

// Botón principal que envía el formulario (muestra que está cargando)
export function PrimarySubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryClass}>
      {pending ? <LoaderCircle className="animate-spin" size={28} aria-hidden="true" /> : null}
      {pending ? "Un momento…" : children}
      {!pending && <ArrowRight size={28} aria-hidden="true" />}
    </button>
  );
}

export function BackButton({ children = "Volver al paso anterior", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
    >
      <ArrowLeft size={26} aria-hidden="true" />
      {children}
    </button>
  );
}

// "612345678" → "612 345 678"
export function formatPhone(digits: string) {
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
