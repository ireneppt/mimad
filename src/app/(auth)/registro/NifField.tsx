"use client";

// Campo "NIF o CIF de la entidad": al salir del campo se comprueba el formato y se busca
// en el Registro de centros de atención social de la Comunidad de Madrid (datos abiertos).
// Es solo un adelanto: la verificación que cuenta la hace la base de datos al guardar.
import { useState, useTransition } from "react";
import { CircleAlert, Database, LoaderCircle, ShieldCheck } from "lucide-react";
import { Field, TextInput } from "@/components/forms";
import { checkNif } from "../actions";

type Result = Awaited<ReturnType<typeof checkNif>> | null;

export default function NifField({ defaultValue }: { defaultValue?: string }) {
  const [result, setResult] = useState<Result>(null);
  const [pending, startTransition] = useTransition();

  const check = (value: string) => {
    if (!value.trim()) return setResult(null);
    startTransition(async () => setResult(await checkNif(value)));
  };

  return (
    <Field label="NIF o CIF de la entidad" htmlFor="nif" hint="Lo usamos para verificar que la entidad es real.">
      <TextInput
        id="nif"
        name="nif"
        placeholder="G12345678"
        required
        maxLength={12}
        autoCapitalize="characters"
        autoComplete="off"
        defaultValue={defaultValue}
        onBlur={(e) => check(e.target.value)}
        aria-describedby="nif-resultado"
        className="uppercase tracking-wider"
      />
      <div id="nif-resultado" aria-live="polite">
        {pending && (
          <p className="flex items-center gap-2 text-sm text-gris">
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Buscando en el Registro oficial…
          </p>
        )}
        {!pending && result?.error && (
          <p className="flex items-start gap-2 text-sm text-red-800">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {result.error}
          </p>
        )}
        {!pending && result && !result.error && (
          <div className={`flex flex-col gap-1 rounded-2xl p-3 text-sm ${result.verificada ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950"}`}>
            <p className="flex items-start gap-2 text-base font-semibold">
              {result.verificada ? <ShieldCheck size={20} className="shrink-0" aria-hidden="true" /> : <CircleAlert size={20} className="shrink-0" aria-hidden="true" />}
              {result.verificada ? `Entidad verificada: ${result.nombre}` : "Este NIF no está en el Registro"}
            </p>
            <p>
              {result.verificada
                ? "Podrás publicar planes directamente."
                : "Puedes crear la cuenta igualmente: tus planes quedarán pendientes de revisión antes de publicarse."}
            </p>
            <p className="flex items-center gap-1.5 text-xs opacity-90">
              <Database size={13} aria-hidden="true" /> Fuente: Registro de centros de atención social · Comunidad de Madrid
            </p>
          </div>
        )}
      </div>
    </Field>
  );
}
