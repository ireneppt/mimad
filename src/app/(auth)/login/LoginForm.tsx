"use client";

import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { Field, FormError, PasswordInput, PhoneInput, SubmitButton } from "@/components/forms";

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <Field label="Teléfono móvil" htmlFor="telefono">
        <PhoneInput id="telefono" name="telefono" required defaultValue={state.fields?.telefono} defaultCountry={state.fields?.pais} />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <PasswordInput id="password" name="password" required autoComplete="current-password" />
      </Field>
      <FormError message={state.error} />
      <SubmitButton>Entrar</SubmitButton>
    </form>
  );
}
