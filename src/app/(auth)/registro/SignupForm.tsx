"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, Circle, CircleCheck, CircleX, LoaderCircle, LocateFixed, MapPin, User } from "lucide-react";
import { signup, type AuthState } from "../actions";
import { Field, FormError, PasswordInput, PhoneInput, SubmitButton, TextInput } from "@/components/forms";
import { INTERESTS } from "@/lib/interests";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { LIMITS, PASSWORD_RULES } from "@/lib/limits";
import type { Point } from "@/lib/location";
import { useMyLocation } from "@/components/useMyLocation";

export default function SignupForm({ municipios }: { municipios: string[] }) {
  const [state, action] = useActionState<AuthState, FormData>(signup, {});
  const [chosen, setChosen] = useState<string[]>(state.fields?.intereses?.split(",").filter(Boolean) ?? []);

  const [homePoint, setHomePoint] = useState<Point | null>(null); // "estoy en casa"
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const { locate, asking, error: geoError } = useMyLocation();

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
        <TextInput id="nombre" name="nombre" placeholder="¿Cómo te llamas?" autoComplete="given-name" required minLength={LIMITS.nameMin} maxLength={LIMITS.nameMax} defaultValue={state.fields?.nombre} />
      </Field>

      <Field label="Teléfono móvil" htmlFor="telefono" hint="Lo usarás para iniciar sesión.">
        <PhoneInput id="telefono" name="telefono" required defaultValue={state.fields?.telefono} defaultCountry={state.fields?.pais} />
      </Field>

      <Field label="Municipio" htmlFor="municipio" hint="Te avisaremos de lo que pasa cerca de ti.">
        <div className="relative">
          <MapPin size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gris" aria-hidden="true" />
          <TextInput id="municipio" name="municipio" list="municipios" placeholder="Escribe tu municipio" className="pl-12" autoComplete="address-level2" maxLength={LIMITS.municipioMax} defaultValue={state.fields?.municipio} />
          <datalist id="municipios">
            {municipios.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
      </Field>

      {/* Opcional: para calcular mejor las distancias que el centro del municipio */}
      <Field label="Código postal (opcional)" htmlFor="codigo_postal" hint="Para calcular mejor lo que tardas en llegar a cada plan.">
        <TextInput
          id="codigo_postal"
          name="codigo_postal"
          inputMode="numeric"
          maxLength={5}
          pattern="28[0-9]{3}"
          placeholder="28012"
          autoComplete="postal-code"
          defaultValue={state.fields?.codigo_postal}
        />
      </Field>
      <div className="-mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={async () => setHomePoint(await locate())}
          disabled={asking}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 font-medium disabled:opacity-60"
        >
          {asking ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={20} aria-hidden="true" />}
          {homePoint ? "Ubicación de tu casa guardada" : asking ? "Buscando dónde estás…" : "Estoy en casa: usar mi ubicación"}
        </button>
        {geoError && <p role="alert" className="text-sm text-red-800">{geoError}</p>}
        {homePoint && (
          <>
            <input type="hidden" name="lat" value={homePoint.lat} />
            <input type="hidden" name="lon" value={homePoint.lon} />
          </>
        )}
      </div>

      <Field label="Correo electrónico" htmlFor="email" optional>
        <TextInput id="email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" maxLength={LIMITS.emailMax} defaultValue={state.fields?.email} />
      </Field>

      <Field label="Contraseña" htmlFor="password">
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          aria-describedby="requisitos-clave"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {/* Requisitos que se marcan en verde según se cumplen */}
        <ul id="requisitos-clave" className="grid grid-cols-1 gap-1 text-sm min-[400px]:grid-cols-2" aria-live="polite">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.id} className={`flex items-center gap-1.5 ${ok ? "text-green-800" : "text-gris"}`}>
                {ok ? <CircleCheck size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
                <span>
                  {r.label}
                  <span className="sr-only">{ok ? ": cumplido" : ": falta"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Field>

      <Field label="Repetir contraseña" htmlFor="password2">
        <PasswordInput
          id="password2"
          name="password2"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
        {password2.length > 0 && (
          <p className={`flex items-center gap-1.5 text-sm ${password2 === password ? "text-green-800" : "text-red-800"}`} aria-live="polite">
            {password2 === password ? <CircleCheck size={16} aria-hidden="true" /> : <CircleX size={16} aria-hidden="true" />}
            {password2 === password ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
          </p>
        )}
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
