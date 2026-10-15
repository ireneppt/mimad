"use client";

// Crear cuenta en la versión simplificada: un dato por pantalla, 6 pasos
// (diseños crear-cuenta-simplificada-pasos-1a4.png y -5a7.png).
// Los datos se guardan en el móvil mientras se rellena (salvo la contraseña)
// y al final se envían todos juntos al mismo registro que la versión por defecto.
import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { signup, type AuthState } from "@/app/(auth)/actions";
import SimpleShell from "@/components/simple/SimpleShell";
import {
  BackButton, BigInput, BigLabel, BigPassword, BigPhoneInput, Hint, PrimaryButton, PrimarySubmit, bigInputClass, formatPhone,
} from "@/components/simple/ui";
import { INTERESTS } from "@/lib/interests";
import { isValidMobile, MIN_PASSWORD_LENGTH, normalizePhone } from "@/lib/auth";

export const DRAFT_KEY = "mm_registro_simple";
const TOTAL = 6;
// Paso al que hay que volver si el servidor rechaza un campo
const STEP_OF_FIELD: Record<string, number> = { nombre: 1, telefono: 2, municipio: 3, password: 5 };

type Draft = { step: number; nombre: string; telefono: string; municipio: string; intereses: string[] };

export default function SimpleSignup({ municipios }: { municipios: string[] }) {
  const [state, action] = useActionState<AuthState, FormData>(signup, {});
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState(""); // solo cifras
  const [municipio, setMunicipio] = useState("");
  const [intereses, setIntereses] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState<"" | "si" | "no">("");
  const [privacidad, setPrivacidad] = useState(false);
  const [tried, setTried] = useState(false); // ha pulsado "Continuar" con algo mal
  const [serverError, setServerError] = useState<string>();
  const [loaded, setLoaded] = useState(false);

  // Recupera lo que dejó a medias (la contraseña nunca se guarda: como mucho vuelve al paso 5)
  useEffect(() => {
    try {
      const d: Partial<Draft> = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
      if (d.nombre) setNombre(d.nombre);
      if (d.telefono) setTelefono(d.telefono);
      if (d.municipio) setMunicipio(d.municipio);
      if (Array.isArray(d.intereses)) setIntereses(d.intereses);
      if (d.step && d.step > 1) setStep(Math.min(d.step, 5));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, nombre, telefono, municipio, intereses } satisfies Draft));
    } catch {}
  }, [loaded, step, nombre, telefono, municipio, intereses]);

  // Si el servidor rechaza algo (p. ej. móvil ya registrado), vuelve al paso de ese campo
  useEffect(() => {
    if (!state.error) return;
    setServerError(state.error);
    setStep(STEP_OF_FIELD[state.field ?? ""] ?? TOTAL);
  }, [state]);

  const go = (to: number) => {
    setTried(false);
    setServerError(undefined);
    setStep(to);
  };

  const phoneOk = isValidMobile(telefono);
  const passwordOk = password.length >= MIN_PASSWORD_LENGTH;
  const valid: Record<number, boolean> = {
    1: nombre.trim().length > 0,
    2: phoneOk,
    3: municipio !== "",
    4: true,
    5: passwordOk && password === password2,
  };
  const next = () => (valid[step] ? go(step + 1) : setTried(true));

  const chosenLabels = INTERESTS.filter((i) => intereses.includes(i.id)).map((i) => i.label);
  const toggleInterest = (id: string) =>
    setIntereses((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const shell = { defaultHref: "/registro", step, total: TOTAL };
  const nav = (
    <div className="flex flex-col gap-4">
      <PrimaryButton onClick={next}>Continuar</PrimaryButton>
      {step > 1 && <BackButton onClick={() => go(step - 1)} />}
    </div>
  );
  const errorBox = serverError && <Hint tone="error">{serverError}</Hint>;

  if (step === 1) {
    return (
      <SimpleShell
        {...shell}
        title="¿Cómo te llamas?"
        intro={<p>Escribe tu nombre. <strong>No hace falta poner los apellidos.</strong> Así te saludaremos en la aplicación.</p>}
        help={<ol><li>Toca la caja blanca. Aparecerá el teclado.</li><li>Escribe tu nombre.</li><li>Toca el botón naranja <strong>Continuar</strong>.</li></ol>}
      >
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="nombre">Tu nombre</BigLabel>
          <BigInput id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} autoComplete="given-name" enterKeyHint="next" onKeyDown={(e) => e.key === "Enter" && next()} />
          {errorBox}
          {nombre.trim() ? (
            <Hint tone="ok">Muy bien. Ahora toca «Continuar».</Hint>
          ) : (
            tried && <Hint tone="error">Escribe tu nombre para seguir.</Hint>
          )}
        </div>
        {nav}
      </SimpleShell>
    );
  }

  if (step === 2) {
    const digits = normalizePhone(telefono);
    const startsWrong = digits.length > 0 && !/^[67]/.test(digits);
    return (
      <SimpleShell
        {...shell}
        title="Escribe tu número de teléfono móvil"
        intro={<p>Lo usarás para <strong>entrar en la aplicación</strong>. Tiene <strong>9 números</strong> y empieza por 6 o por 7.</p>}
        help={<ol><li>Toca la caja blanca. Aparecerá el teclado de números.</li><li>Escribe tu móvil. <strong>No hace falta poner +34.</strong></li><li>Toca el botón naranja <strong>Continuar</strong>.</li></ol>}
      >
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="telefono">Tu número de móvil</BigLabel>
          <BigPhoneInput
            id="telefono"
            value={formatPhone(telefono)}
            onChange={(e) => setTelefono(normalizePhone(e.target.value).slice(0, 9))}
            onKeyDown={(e) => e.key === "Enter" && next()}
            enterKeyHint="next"
          />
          {errorBox}
          {phoneOk ? (
            <Hint tone="ok">Perfecto: has escrito los 9 números. Ahora toca «Continuar».</Hint>
          ) : startsWrong ? (
            <Hint tone="error">El móvil tiene que empezar por 6 o por 7.</Hint>
          ) : (
            (digits.length > 0 || tried) && <Hint tone={tried ? "error" : "info"}>Has escrito {digits.length} de 9 números.</Hint>
          )}
        </div>
        {nav}
      </SimpleShell>
    );
  }

  if (step === 3) {
    return (
      <SimpleShell
        {...shell}
        title="¿Dónde vives?"
        intro={<p>Elige tu <strong>pueblo o ciudad</strong>. Te enseñaremos actividades <strong>cerca de tu casa</strong>.</p>}
        help={<ol><li>Toca la caja blanca. Aparecerá una lista.</li><li>Busca tu pueblo o ciudad y tócalo.</li><li>Toca el botón naranja <strong>Continuar</strong>.</li></ol>}
      >
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="municipio">Tu municipio</BigLabel>
          <select id="municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={`${bigInputClass} appearance-auto`}>
            <option value="">Elige uno…</option>
            {municipios.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {errorBox}
          {municipio ? (
            <Hint tone="ok">Muy bien. Ahora toca «Continuar».</Hint>
          ) : (
            tried && <Hint tone="error">Elige dónde vives para seguir.</Hint>
          )}
        </div>
        {nav}
      </SimpleShell>
    );
  }

  if (step === 4) {
    return (
      <SimpleShell
        {...shell}
        title="¿Qué te gusta hacer?"
        intro={<p>Toca <strong>todas las que quieras</strong>. Si te equivocas, tócala otra vez para quitarla.</p>}
        help={<ol><li>Toca las cosas que te gustan. Se ponen de color.</li><li>Para quitar una, tócala otra vez.</li><li>Cuando acabes, toca el botón naranja <strong>Continuar</strong>.</li></ol>}
      >
        <fieldset>
          <legend className="sr-only">Tus intereses</legend>
          <div className="grid grid-cols-2 gap-3">
            {INTERESTS.map(({ id, label, icon: Icon }) => {
              const on = intereses.includes(id);
              return (
                <label
                  key={id}
                  className={`relative flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-xl font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tinta ${
                    on ? "bg-degradado-fuerte border-transparent text-white" : "border-slate-500 bg-white"
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleInterest(id)} className="sr-only" />
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
        <Hint tone={intereses.length ? "ok" : "info"}>
          {intereses.length
            ? `Has elegido ${intereses.length}: ${chosenLabels.join(", ")}. Puedes elegir más o tocar «Continuar».`
            : "Si no quieres elegir ahora, toca «Continuar». Podrás cambiarlo después."}
        </Hint>
        {nav}
      </SimpleShell>
    );
  }

  if (step === 5) {
    const mismatch = password2.length > 0 && password !== password2;
    return (
      <SimpleShell
        {...shell}
        title="Elige una contraseña"
        intro={<p>Te la pediremos para entrar. Debe tener <strong>al menos {MIN_PASSWORD_LENGTH} letras o números</strong>. Te recomendamos <strong>apuntarla en un lugar seguro</strong>.</p>}
        help={<ol><li>Toca la primera caja y escribe una contraseña de {MIN_PASSWORD_LENGTH} letras o números o más.</li><li>Toca la segunda caja y escríbela otra vez, igual.</li><li>Si quieres ver lo que escribes, toca <strong>Mostrar la contraseña</strong>.</li><li>Toca el botón naranja <strong>Continuar</strong>.</li></ol>}
      >
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="password">Tu contraseña</BigLabel>
          <BigPassword id="password" visible={showPassword} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <BigLabel htmlFor="password2">Escríbela otra vez</BigLabel>
          <BigPassword
            id="password2"
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && next()}
            autoComplete="new-password"
          />
          {errorBox}
          {valid[5] ? (
            <Hint tone="ok">Perfecto: las dos contraseñas son iguales. Ahora toca «Continuar».</Hint>
          ) : mismatch ? (
            <Hint tone="error">Las dos contraseñas no son iguales. Revísalas.</Hint>
          ) : (
            (password.length > 0 || tried) && !passwordOk && (
              <Hint tone={tried ? "error" : "info"}>Llevas {password.length} de {MIN_PASSWORD_LENGTH} letras o números como mínimo.</Hint>
            )
          )}
          {tried && passwordOk && !password2 && <Hint tone="error">Escribe la contraseña otra vez en la segunda caja.</Hint>}
        </div>
        {nav}
      </SimpleShell>
    );
  }

  // Paso 6: revisar y crear la cuenta
  const missing = !whatsapp ? "Elige si quieres avisos por WhatsApp." : !privacidad ? "Para crear la cuenta, marca que aceptas la política de privacidad." : undefined;
  const radioClass = (on: boolean) =>
    `flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 px-5 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tinta ${
      on ? "border-coral-texto bg-red-50" : "border-slate-500 bg-white"
    }`;

  return (
    <SimpleShell
      {...shell}
      title="Revisa y termina"
      intro={<p>Comprueba que todo está bien. Si algo no está bien, puedes <strong>volver atrás</strong>.</p>}
      help={<ol><li>Lee tus datos en el recuadro gris.</li><li>Elige si quieres avisos por WhatsApp.</li><li>Marca la casilla de la privacidad.</li><li>Toca el botón naranja <strong>Crear mi cuenta</strong>.</li></ol>}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-slate-100 p-5 text-xl">
        <dt className="text-gris">Nombre</dt>
        <dd className="font-semibold">{nombre}</dd>
        <dt className="text-gris">Móvil</dt>
        <dd className="font-semibold">+34 {formatPhone(telefono)}</dd>
        <dt className="text-gris">Vives en</dt>
        <dd className="font-semibold">{municipio}</dd>
        <dt className="text-gris">Te gusta</dt>
        <dd className="font-semibold">{chosenLabels.length ? chosenLabels.join(", ") : "Sin elegir"}</dd>
      </dl>

      <form
        action={action}
        onSubmit={(e) => {
          if (missing) {
            e.preventDefault();
            setTried(true);
          }
        }}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="simplificada" value="1" />
        <input type="hidden" name="nombre" value={nombre.trim()} />
        <input type="hidden" name="telefono" value={telefono} />
        <input type="hidden" name="municipio" value={municipio} />
        {intereses.map((i) => (
          <input key={i} type="hidden" name="intereses" value={i} />
        ))}
        <input type="hidden" name="password" value={password} />
        <input type="hidden" name="password2" value={password2} />
        {whatsapp === "si" && <input type="hidden" name="whatsapp" value="on" />}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-xl font-bold">¿Quieres recibir avisos por WhatsApp?</legend>
          <label className={radioClass(whatsapp === "si")}>
            <input type="radio" name="whatsapp_opcion" checked={whatsapp === "si"} onChange={() => setWhatsapp("si")} className="h-7 w-7 shrink-0 accent-coral-texto" />
            <span className="text-xl font-bold">
              Sí, quiero avisos
              <span className="block text-lg font-normal">Te recordaremos tus actividades.</span>
            </span>
          </label>
          <label className={radioClass(whatsapp === "no")}>
            <input type="radio" name="whatsapp_opcion" checked={whatsapp === "no"} onChange={() => setWhatsapp("no")} className="h-7 w-7 shrink-0 accent-coral-texto" />
            <span className="text-xl font-bold">No, gracias</span>
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-xl font-bold">Privacidad</legend>
          <label className={radioClass(privacidad)}>
            <input type="checkbox" name="privacidad" checked={privacidad} onChange={(e) => setPrivacidad(e.target.checked)} className="h-7 w-7 shrink-0 accent-coral-texto" />
            <span className="text-xl font-bold">Acepto la política de privacidad</span>
          </label>
          <a href="/privacidad" target="_blank" className="text-lg text-blue-800 underline">
            Leer la política de privacidad (se abre en otra pestaña)
          </a>
        </fieldset>

        {errorBox}
        {missing ? tried && <Hint tone="error">{missing}</Hint> : <Hint tone="ok">Todo listo. Toca «Crear mi cuenta».</Hint>}

        <PrimarySubmit>Crear mi cuenta</PrimarySubmit>
        <BackButton onClick={() => go(5)} />
      </form>
    </SimpleShell>
  );
}
