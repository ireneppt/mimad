"use client";

// Piezas de formulario comunes (versión por defecto)
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { COUNTRIES, findCountry } from "@/lib/countries";
import { LIMITS } from "@/lib/limits";

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

// Móvil con selector de país. Envía dos campos: el número (props.name) y el país ("pais").
export function PhoneInput({
  defaultCountry, ...props
}: InputHTMLAttributes<HTMLInputElement> & { defaultCountry?: string }) {
  const [country, setCountry] = useState(findCountry(defaultCountry));

  return (
    <div className="flex h-14 overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-tinta">
      {/* El select es invisible encima del prefijo: se ve "+34 ▾" y al tocar salen los países */}
      <div className="relative flex shrink-0 items-center gap-1 border-r border-slate-200 pl-4 pr-3 text-lg text-gris has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tinta">
        <span aria-hidden="true">+{country.prefix}</span>
        <ChevronDown size={16} aria-hidden="true" />
        <select
          name="pais"
          value={country.code}
          onChange={(e) => setCountry(findCountry(e.target.value))}
          aria-label="País del móvil"
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} (+{c.prefix})
            </option>
          ))}
        </select>
      </div>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country.code === "ES" ? "600 000 000" : "Número de móvil"}
        maxLength={LIMITS.phoneMax}
        // Solo cifras, espacios y "+": se quita lo demás al escribir o pegar
        onInput={(e) => {
          const el = e.currentTarget;
          el.value = el.value.replace(/[^\d\s+]/g, "");
        }}
        {...props}
        className="w-full min-w-0 px-4 text-lg placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input maxLength={LIMITS.passwordMax} {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-14`} />
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
