"use client";

// Piezas de formulario comunes (versión por defecto)
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";

const inputClass =
  "h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg text-tinta placeholder:text-slate-400 focus:border-tinta focus:outline-none";

export function Field({
  label, hint, optional, htmlFor, children,
}: { label: string; hint?: string; optional?: boolean; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-base font-medium">{label}</label>
        {optional && <span className="text-sm text-gris">Opcional</span>}
      </div>
      {children}
      {hint && <p className="text-sm text-gris">{hint}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex h-14 overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-tinta">
      <span className="flex items-center border-r border-slate-200 px-4 text-lg text-gris" aria-hidden="true">+34</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="600 000 000"
        {...props}
        className="w-full px-4 text-lg placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-14`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-gris"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-degradado flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-lg shadow-coral/25 disabled:opacity-70"
    >
      {pending && <LoaderCircle className="animate-spin" size={22} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-base text-red-800">
      <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
