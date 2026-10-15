"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, MapPin, User } from "lucide-react";
import { signup, type AuthState } from "../actions";
import { Field, FormError, PasswordInput, PhoneInput, SubmitButton, TextInput } from "@/components/forms";
import { INTERESTS } from "@/lib/interests";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";

export default function SignupForm({ municipios }: { municipios: string[] }) {
  const [state, action] = useActionState<AuthState, FormData>(signup, {});
  const [chosen, setChosen] = useState<string[]>(state.fields?.intereses?.split(",").filter(Boolean) ?? []);

  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <form action={action} className="flex flex-col gap-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gris">Tu cuenta</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-medium">Tipo de cuenta</legend>
        <div className="grid grid-cols-2 gap-3">
          <span className="flex h-16 items-center gap-2 rounded-2xl border-2 border-coral bg-coral/5 px-4 font-medium" aria-current="true">
            <User size={20} className="text-coral-texto" aria-hidden="true" /> Persona
          </span>
          <Link href="/registro/entidad" className="flex h-16 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-medium leading-tight">
            <Building2 size={20} aria-hidden="true" /> Entidad u organización
          </Link>
        </div>
      </fieldset>

      <Field label="Nombre" htmlFor="nombre">
        <TextInput id="nombre" name="nombre" placeholder="¿Cómo te llamas?" autoComplete="given-name" required defaultValue={state.fields?.nombre} />
      </Field>

      <Field label="Teléfono móvil" htmlFor="telefono" hint="Lo usarás para iniciar sesión.">
        <PhoneInput id="telefono" name="telefono" required defaultValue={state.fields?.telefono} />
      </Field>

      <Field label="Municipio" htmlFor="municipio" hint="Te avisaremos de lo que pasa cerca de ti.">
        <div className="relative">
          <MapPin size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gris" aria-hidden="true" />
          <TextInput id="municipio" name="municipio" list="municipios" placeholder="Escribe tu municipio" className="pl-12" autoComplete="address-level2" defaultValue={state.fields?.municipio} />
          <datalist id="municipios">
            {municipios.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
      </Field>

      <Field label="Correo electrónico" htmlFor="email" optional>
        <TextInput id="email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" defaultValue={state.fields?.email} />
      </Field>

      <Field label="Contraseña" htmlFor="password" hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
        <PasswordInput id="password" name="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
      </Field>

      <Field label="Repetir contraseña" htmlFor="password2">
        <PasswordInput id="password2" name="password2" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
      </Field>

      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wider text-gris">Tus intereses</h2>
      <fieldset className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <legend className="text-base font-medium">¿Qué te apetece hacer?</legend>
          <span className="text-sm text-gris" aria-live="polite">{chosen.length} elegidos</span>
        </div>
        <p className="text-sm text-gris">Elige todos los que quieras. Los usaremos para recomendarte actividades.</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(({ id, label, icon: Icon }) => {
            const on = chosen.includes(id);
            return (
              <label
                key={id}
                className={`flex h-12 cursor-pointer items-center gap-2 rounded-full border px-4 text-base font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tinta ${
                  on ? "bg-degradado border-transparent text-white" : "border-slate-200 bg-white text-tinta"
                }`}
              >
                <input type="checkbox" name="intereses" value={id} checked={on} onChange={() => toggle(id)} className="sr-only" />
                <Icon size={18} aria-hidden="true" className={on ? "" : "text-coral-texto"} />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-base">
        <input type="checkbox" name="privacidad" required className="mt-1 h-5 w-5 accent-coral" />
        <span>
          He leído y acepto la{" "}
          <Link href="/privacidad" className="text-coral-texto underline">política de privacidad</Link>.
        </span>
      </label>
      <label className="flex items-start gap-3 text-base">
        <input type="checkbox" name="whatsapp" className="mt-1 h-5 w-5 accent-coral" />
        <span>
          Quiero recibir avisos por WhatsApp.
          <span className="block text-sm text-gris">Recordatorios de tus actividades y novedades cerca de ti. Puedes desactivarlo cuando quieras.</span>
        </span>
      </label>

      <FormError message={state.error} />
      <SubmitButton>Crear cuenta</SubmitButton>
    </form>
  );
}
