"use client";

// Pantallas para cambiar un dato del perfil: una sola cosa por pantalla,
// con "Guardar" grande y "Volver sin cambiar nada".
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, LocateFixed } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import { BigInput, BigLabel, BigPassword, Hint, PrimarySubmit, bigInputClass } from "@/components/simple/ui";
import { useMyLocation } from "@/components/useMyLocation";
import { INTERESTS } from "@/lib/interests";
import { isPostalCode, type Point } from "@/lib/location";
import { updateHome, updateInterests, updateName, updatePassword, type ProfileState } from "./actions";

function Cancel() {
  return (
    <Link
      href="/simple/perfil"
      className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
    >
      <ArrowLeft size={26} aria-hidden="true" />
      Volver sin cambiar nada
    </Link>
  );
}

const shell = { defaultHref: "/perfil" };

export function NameEditor({ nombre }: { nombre: string }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateName, {});
  return (
    <SimpleShell
      {...shell}
      title="Cambiar mi nombre"
      intro={<p>Escribe cómo quieres que te llamemos.</p>}
      help={<ol><li>Toca la caja blanca y escribe tu nombre.</li><li>Toca el botón naranja <strong>Guardar</strong>.</li></ol>}
    >
      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="nombre">Tu nombre</BigLabel>
          <BigInput id="nombre" name="nombre" defaultValue={nombre} maxLength={60} autoComplete="given-name" required />
        </div>
        {state.error && <Hint tone="error">{state.error}</Hint>}
        <PrimarySubmit>Guardar</PrimarySubmit>
      </form>
      <Cancel />
    </SimpleShell>
  );
}

export function HomeEditor({ municipio, municipios }: { municipio: string; municipios: string[] }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateHome, {});
  const [cp, setCp] = useState("");
  const [homePoint, setHomePoint] = useState<Point | null>(null);
  const { locate, asking, error: geoError } = useMyLocation();

  return (
    <SimpleShell
      {...shell}
      title="Dónde vivo"
      intro={<p>Así te enseñamos planes <strong>cerca de tu casa</strong> y cuánto tardas en llegar.</p>}
      help={
        <ol>
          <li>Elige tu pueblo o ciudad en la lista.</li>
          <li>Si quieres, escribe tu <strong>código postal</strong> o, si estás en casa, toca <strong>Estoy en casa: usar mi ubicación</strong>.</li>
          <li>Toca el botón naranja <strong>Guardar</strong>.</li>
        </ol>
      }
    >
      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="municipio">Tu municipio</BigLabel>
          <select id="municipio" name="municipio" defaultValue={municipio} className={`${bigInputClass} appearance-auto`}>
            <option value="">Elige uno…</option>
            {municipios.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-100 p-4">
          <p className="text-xl font-bold">Para calcular mejor las distancias <span className="font-normal">(puedes saltarlo)</span></p>
          <BigLabel htmlFor="codigo_postal">Tu código postal</BigLabel>
          <BigInput
            id="codigo_postal"
            name="codigo_postal"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="Por ejemplo, 28012"
            value={cp}
            onChange={(e) => setCp(e.target.value.replace(/\D/g, ""))}
            className="tracking-widest"
          />
          {cp.length === 5 && !isPostalCode(cp) && <Hint tone="error">El código postal empieza por 28.</Hint>}
          <p className="text-center text-xl">o</p>
          <button
            type="button"
            onClick={async () => setHomePoint(await locate())}
            disabled={asking}
            className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white px-4 text-xl font-semibold disabled:opacity-60"
          >
            {asking ? <LoaderCircle size={26} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={26} aria-hidden="true" />}
            {asking ? "Buscando dónde estás…" : "Estoy en casa: usar mi ubicación"}
          </button>
          {homePoint && (
            <>
              <input type="hidden" name="lat" value={homePoint.lat} />
              <input type="hidden" name="lon" value={homePoint.lon} />
              <Hint tone="ok">Hemos encontrado dónde está tu casa. Toca «Guardar».</Hint>
            </>
          )}
          {geoError && <Hint tone="error">{geoError}</Hint>}
        </div>

        {state.error && <Hint tone="error">{state.error}</Hint>}
        <PrimarySubmit>Guardar</PrimarySubmit>
      </form>
      <Cancel />
    </SimpleShell>
  );
}

export function InterestsEditor({ intereses }: { intereses: string[] }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateInterests, {});
  const [chosen, setChosen] = useState(intereses);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <SimpleShell
      {...shell}
      title="Lo que me gusta"
      intro={<p>Toca <strong>todas las que quieras</strong>. Te enseñaremos antes los planes que te gustan.</p>}
      help={<ol><li>Toca las cosas que te gustan. Se ponen de color.</li><li>Para quitar una, tócala otra vez.</li><li>Toca el botón naranja <strong>Guardar</strong>.</li></ol>}
    >
      <form action={action} className="flex flex-col gap-5">
        <fieldset>
          <legend className="sr-only">Tus gustos</legend>
          <div className="grid grid-cols-2 gap-3">
            {INTERESTS.map(({ id, label, icon: Icon }) => {
              const on = chosen.includes(id);
              return (
                <label
                  key={id}
                  className={`relative flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-xl font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tinta ${
                    on ? "bg-degradado-fuerte border-transparent text-white" : "border-slate-500 bg-white"
                  }`}
                >
                  <input type="checkbox" name="intereses" value={id} checked={on} onChange={() => toggle(id)} className="sr-only" />
                  <Icon size={34} aria-hidden="true" className={on ? "" : "text-coral-texto"} />
                  {label}
                  {on && (
                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-green-700" aria-hidden="true">
                      <Check size={20} strokeWidth={3} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
        {state.error && <Hint tone="error">{state.error}</Hint>}
        <PrimarySubmit>Guardar</PrimarySubmit>
      </form>
      <Cancel />
    </SimpleShell>
  );
}

export function PasswordEditor() {
  const [state, action] = useActionState<ProfileState, FormData>(updatePassword, {});
  const [visible, setVisible] = useState(false);
  return (
    <SimpleShell
      {...shell}
      title="Cambiar mi contraseña"
      intro={<p>Escribe la contraseña nueva <strong>dos veces</strong>, para estar seguros.</p>}
      help={<ol><li>Escribe la contraseña nueva en la primera caja.</li><li>Escríbela otra vez en la segunda.</li><li>Toca el botón naranja <strong>Guardar</strong>.</li></ol>}
    >
      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="password">Contraseña nueva</BigLabel>
          <BigPassword id="password" name="password" visible={visible} onToggle={() => setVisible((v) => !v)} autoComplete="new-password" required />
        </div>
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="password2">Escríbela otra vez</BigLabel>
          <BigPassword id="password2" name="password2" visible={visible} autoComplete="new-password" required />
        </div>
        {state.error && <Hint tone="error">{state.error}</Hint>}
        <PrimarySubmit>Guardar</PrimarySubmit>
      </form>
      <Cancel />
    </SimpleShell>
  );
}
