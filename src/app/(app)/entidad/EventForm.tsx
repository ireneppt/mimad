"use client";

// Formulario de un plan de la entidad (diseño crear-evento.png). Sirve para publicar
// uno nuevo y para editar uno existente.
import { useActionState, useState } from "react";
import { CircleCheck, LoaderCircle, MapPin } from "lucide-react";
import { Field, FormError, TextInput } from "@/components/forms";
import { ENTITY_AUDIENCES, ENTITY_CATEGORIES, type EntityEvent } from "@/lib/entityEvents";
import { createEvent, updateEvent, type EventFormState } from "./actions";

const selectClass = "h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg focus:border-tinta focus:outline-none";

export default function EventForm({ evento, municipios, defaultMunicipio }: { evento?: EntityEvent; municipios: string[]; defaultMunicipio?: string }) {
  const editing = !!evento;
  const [state, action, pending] = useActionState<EventFormState, FormData>(editing ? updateEvent : createEvent, {});
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);
  const v = state.values;
  const initial = (k: string, fallback = "") => v?.[k] ?? fallback;
  const [free, setFree] = useState(initial("gratuito", evento ? (evento.gratuito ? "si" : "no") : "si") !== "no");

  return (
    <form action={action} className="flex flex-col gap-5">
      {evento && <input type="hidden" name="id" value={evento.id} />}

      <Section n={1} title="Lo básico">
          <Field label="Título del plan" htmlFor="titulo">
            <TextInput id="titulo" name="titulo" required minLength={3} maxLength={150} placeholder="Taller de cerámica para principiantes" defaultValue={initial("titulo", evento?.titulo)} />
          </Field>

          <Field label="Tipo de plan" htmlFor="categoria">
            <select id="categoria" name="categoria" required defaultValue={initial("categoria", evento?.categoria ?? "")} className={selectClass}>
              <option value="" disabled>Elige uno</option>
              {ENTITY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Descripción" htmlFor="descripcion" optional hint="Qué se va a hacer, qué hay que llevar, si hace falta experiencia…">
            <textarea
              id="descripcion"
              name="descripcion"
              maxLength={3000}
              rows={4}
              defaultValue={initial("descripcion", evento?.descripcion ?? "")}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg focus:border-tinta focus:outline-none"
            />
          </Field>
      </Section>

      <Section n={2} title="Cuándo y dónde">
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-3">
            <Field label="Día" htmlFor="fecha">
              <TextInput id="fecha" name="fecha" type="date" required min={today} defaultValue={initial("fecha", evento?.fecha_inicio.slice(0, 10))} />
            </Field>
            <Field label="Empieza" htmlFor="hora_inicio">
              <TextInput id="hora_inicio" name="hora_inicio" type="time" required defaultValue={initial("hora_inicio", evento?.fecha_inicio.slice(11, 16))} />
            </Field>
            <Field label="Acaba" htmlFor="hora_fin" optional>
              <TextInput id="hora_fin" name="hora_fin" type="time" defaultValue={initial("hora_fin", evento?.fecha_fin?.slice(11, 16) ?? "")} />
            </Field>
          </div>

          <Field label="Dirección" htmlFor="direccion" hint="Calle y número. La buscamos en el mapa para que la gente sepa llegar.">
            <div className="relative">
              <MapPin size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gris" aria-hidden="true" />
              <TextInput id="direccion" name="direccion" required minLength={5} maxLength={200} placeholder="Calle del Bronce, 16" className="pl-12" autoComplete="street-address" defaultValue={initial("direccion", evento?.direccion ?? "")} />
            </div>
          </Field>

          <Field label="Municipio" htmlFor="municipio-evento">
            <TextInput id="municipio-evento" name="municipio" list="municipios-evento" maxLength={60} defaultValue={initial("municipio", evento?.municipio ?? defaultMunicipio ?? "Madrid")} />
            <datalist id="municipios-evento">{municipios.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
      </Section>

      <Section n={3} title="Precio, público y plazas">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-medium">¿Cuesta dinero?</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["si", "Gratis"],
                ["no", "Tiene precio"],
              ].map(([value, label]) => (
                <label key={value} className={`flex h-14 cursor-pointer items-center justify-center rounded-2xl text-lg font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tinta ${(value === "si") === free ? "border-2 border-coral bg-coral/5" : "border border-slate-200 bg-white"}`}>
                  <input type="radio" name="gratuito" value={value} checked={(value === "si") === free} onChange={() => setFree(value === "si")} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
            {!free && (
              <TextInput name="precio" aria-label="Precio" required maxLength={100} placeholder="3 € (materiales incluidos)" defaultValue={initial("precio", evento?.precio ?? "")} />
            )}
          </fieldset>

          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
            <Field label="Para quién es" htmlFor="publico" optional>
              <select id="publico" name="publico" defaultValue={initial("publico", evento?.publico ?? "")} className={selectClass}>
                <option value="">Sin indicar</option>
                {ENTITY_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Plazas" htmlFor="plazas" optional>
              <TextInput id="plazas" name="plazas" type="number" inputMode="numeric" min={1} max={10000} placeholder="Sin límite" defaultValue={initial("plazas", evento?.plazas ? String(evento.plazas) : "")} />
            </Field>
          </div>
      </Section>

      <Section n={4} title="Accesibilidad">
          <label className="flex items-start gap-3 text-base">
            <input type="checkbox" name="accesible" defaultChecked={initial("accesible", evento?.accesible ? "on" : "") === "on"} className="mt-1 h-5 w-5 accent-coral" />
            <span>
              El lugar es accesible
              <span className="block text-sm text-gris">Se puede entrar en silla de ruedas, sin escalones o con rampa.</span>
            </span>
          </label>
      </Section>

      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-green-50 p-4 text-base text-green-900">
          <CircleCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" /> {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className="bg-degradado flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-lg shadow-coral/25 disabled:opacity-70">
        {pending && <LoaderCircle size={22} className="animate-spin" aria-hidden="true" />}
        {pending ? "Buscando la dirección y guardando…" : editing ? "Guardar cambios" : "Publicar plan"}
      </button>
    </form>
  );
}

// Bloque numerado del formulario (como en el diseño)
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby={`seccion-${n}`}>
      <h2 id={`seccion-${n}`} className="flex items-center gap-3 text-xl font-bold">
        <span className="bg-degradado flex h-8 w-8 items-center justify-center rounded-full text-base text-white" aria-hidden="true">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
