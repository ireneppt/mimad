"use client";

import { useActionState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { Field, FormError, TextInput } from "@/components/forms";
import { saveEntity } from "./actions";

// Corregir el nombre o el NIF de la entidad (o crearla si no se guardó al registrarse)
export default function EntityForm({ nombre, nif }: { nombre: string; nif: string }) {
  const [state, action, pending] = useActionState(saveEntity, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nombre de la entidad" htmlFor="ent-nombre">
        <TextInput id="ent-nombre" name="nombre" defaultValue={nombre} required minLength={2} maxLength={120} autoComplete="organization" />
      </Field>
      <Field label="NIF o CIF" htmlFor="ent-nif" hint="Se vuelve a comprobar en el Registro de centros de atención social al guardarlo.">
        <TextInput id="ent-nif" name="nif" defaultValue={nif} required maxLength={12} autoCapitalize="characters" autoComplete="off" className="uppercase tracking-wider" />
      </Field>
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="flex items-center gap-2 text-base text-green-800">
          <CircleCheck size={18} aria-hidden="true" /> {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className="bg-degradado flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white disabled:opacity-70">
        {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />} Guardar y verificar
      </button>
    </form>
  );
}
