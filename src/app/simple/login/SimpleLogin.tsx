"use client";

// Entrar en la versión simplificada: 1) móvil, 2) contraseña
// (diseños simplificada-paso1.png, simplificada-paso2.png y simplificada-ayuda.png).
import Link from "next/link";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { login, type AuthState } from "@/app/(auth)/actions";
import SimpleShell from "@/components/simple/SimpleShell";
import { BackButton, BigLabel, BigPassword, BigPhoneInput, Hint, PrimaryButton, PrimarySubmit, formatPhone } from "@/components/simple/ui";
import { isValidMobile, normalizePhone } from "@/lib/auth";

export default function SimpleLogin({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(login, {});
  const [step, setStep] = useState<1 | 2>(1);
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tried, setTried] = useState(false);
  const [forgot, setForgot] = useState(false);

  const phoneOk = isValidMobile(telefono);
  const goToPassword = () => {
    if (!phoneOk) return setTried(true);
    setTried(false);
    setStep(2);
  };

  const help = (
    <ol>
      <li>Toca la caja blanca grande. Aparecerá el teclado.</li>
      <li>Escribe tu número de móvil. No hace falta poner +34.</li>
      <li>Toca el botón naranja <strong>Continuar</strong>.</li>
      <li>Escribe tu contraseña y toca <strong>Entrar en MiMad</strong>.</li>
    </ol>
  );

  if (step === 1) {
    const startsWrong = telefono.length > 0 && !/^[67]/.test(telefono);
    return (
      <SimpleShell
        defaultHref="/login"
        step={1}
        total={2}
        title="Escribe tu número de teléfono móvil"
        intro={<p>Es el número con el que creaste tu cuenta. Tiene <strong>9 números</strong> y empieza por 6 o por 7.</p>}
        help={help}
      >
        <div className="flex flex-col gap-3">
          <BigLabel htmlFor="telefono">Tu número de móvil</BigLabel>
          <BigPhoneInput
            id="telefono"
            value={formatPhone(telefono)}
            onChange={(e) => setTelefono(normalizePhone(e.target.value).slice(0, 9))}
            onKeyDown={(e) => e.key === "Enter" && goToPassword()}
            enterKeyHint="next"
          />
          {phoneOk ? (
            <Hint tone="ok">Perfecto: has escrito los 9 números. Ahora toca «Continuar».</Hint>
          ) : startsWrong ? (
            <Hint tone="error">El móvil tiene que empezar por 6 o por 7.</Hint>
          ) : (
            (telefono.length > 0 || tried) && <Hint tone={tried ? "error" : "info"}>Has escrito {telefono.length} de 9 números.</Hint>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <PrimaryButton onClick={goToPassword}>Continuar</PrimaryButton>
          <p className="text-center text-lg text-gris">Después te pediremos tu contraseña.</p>
        </div>
        <p className="text-center text-xl">
          ¿Todavía no tienes cuenta?{" "}
          <Link href="/simple/registro" className="font-bold text-coral-texto underline">
            Crear una cuenta
          </Link>
        </p>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell
      defaultHref="/login"
      step={2}
      total={2}
      title="Escribe tu contraseña"
      intro={<p>Es la contraseña que elegiste al crear tu cuenta. Fíjate en las <strong>mayúsculas y minúsculas</strong>.</p>}
      help={help}
    >
      <p className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-xl text-green-800">
        <Check size={26} strokeWidth={3} aria-hidden="true" />
        <span>
          Teléfono: <strong>+34 {formatPhone(telefono)}</strong>
        </span>
      </p>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="telefono" value={telefono} />
        <input type="hidden" name="next" value={next} />
        <BigLabel htmlFor="password">Tu contraseña</BigLabel>
        <BigPassword
          id="password"
          name="password"
          required
          autoComplete="current-password"
          visible={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {state.error && <Hint tone="error">{state.error} Revisa la contraseña o vuelve a escribir el teléfono.</Hint>}
        <PrimarySubmit>Entrar en MiMad</PrimarySubmit>
        <BackButton onClick={() => setStep(1)}>Volver y cambiar el teléfono</BackButton>
      </form>

      <div className="flex flex-col gap-4 rounded-2xl bg-slate-100 p-5 text-xl leading-relaxed">
        <p>
          <strong>¿No recuerdas tu contraseña?</strong>
        </p>
        <button
          type="button"
          onClick={() => setForgot(true)}
          aria-expanded={forgot}
          className="flex h-16 items-center justify-center rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
        >
          No recuerdo mi contraseña
        </button>
        {forgot && (
          <Hint tone="info">
            Pronto podrás crear una nueva por WhatsApp. Mientras tanto, pide ayuda a un familiar o a la persona que te ayudó a
            crear la cuenta.
          </Hint>
        )}
      </div>
    </SimpleShell>
  );
}
