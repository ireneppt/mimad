"use client";

// "📍 Distancias desde tu casa · Cambiar": desde dónde se cuentan los minutos andando.
// Permite usar la ubicación del móvil (temporal), guardarla como casa o escribir el código postal.
import { useActionState, useState, useTransition } from "react";
import type { OriginKind } from "@/lib/origin";
import { useRouter } from "next/navigation";
import { Home, LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { useMyLocation } from "@/components/useMyLocation";
import { Hint, bigInputClass } from "@/components/simple/ui";
import type { Point } from "@/lib/location";
import {
  clearHereLocation, saveHomeHere, savePostalCode, setHereLocation, type LocationState,
} from "@/lib/locationActions";

type Props = {
  kind: OriginKind;
  cp?: string; // código postal escrito sin cuenta
  here: Point | null; // dónde está ahora (si lo está usando)
  loggedIn: boolean;
  hasHome: boolean;
};

const summary = (kind: OriginKind, cp?: string) =>
  ({
    aqui: "Distancias desde donde estás ahora",
    cp: `Distancias desde el código postal ${cp}`,
    casa: "Distancias desde tu casa",
    centro: "Distancias desde el centro de Madrid",
  })[kind];

const buttonClass =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white px-4 text-xl font-semibold disabled:opacity-60";

const toForm = (p: Point) => {
  const f = new FormData();
  f.set("lat", String(p.lat));
  f.set("lon", String(p.lon));
  return f;
};

export default function LocationPanel({ kind, cp, here, loggedIn, hasHome }: Props) {
  const router = useRouter();
  const { locate, asking, error: geoError } = useMyLocation();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<LocationState>({});
  // Qué mensaje enseñar: el de lo último que ha hecho (ubicación, código postal u otro botón)
  const [last, setLast] = useState<"geo" | "cp" | "action">("action");
  const [cpState, cpAction, cpPending] = useActionState(savePostalCode, {});
  const busy = asking || pending || cpPending;
  // Abierto al principio si aún no sabemos dónde vive; luego lo decide la persona
  const [open, setOpen] = useState(kind === "centro");

  function run(action: () => Promise<LocationState>) {
    setLast("action");
    startTransition(async () => {
      setMessage(await action());
      router.refresh();
    });
  }

  async function takeMyPlace() {
    setLast("geo");
    const p = await locate();
    if (p) run(() => setHereLocation(toForm(p)));
  }

  const shown: LocationState = last === "geo" && geoError ? { error: geoError } : last === "cp" ? cpState : message;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-2xl border-2 border-slate-300 bg-white"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 text-xl">
        <MapPin size={26} className="shrink-0 text-coral-texto" aria-hidden="true" />
        <span className="flex-1 font-semibold">{summary(kind, cp)}</span>
        <span className="font-bold text-coral-texto underline group-open:hidden">Cambiar</span>
      </summary>

      <div className="flex flex-col gap-4 border-t-2 border-slate-100 p-4">
        {kind === "centro" && (
          <p className="text-xl leading-snug">
            Todavía no sabemos dónde vives. Dínoslo para calcular mejor cuánto tardas en llegar.
          </p>
        )}

        {kind !== "aqui" && (
          <button type="button" onClick={takeMyPlace} disabled={busy} className={buttonClass}>
            {asking ? <LoaderCircle size={26} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={26} aria-hidden="true" />}
            {asking ? "Buscando dónde estás…" : "Usar dónde estoy ahora"}
          </button>
        )}
        {kind === "cp" && (
          <button type="button" onClick={() => run(clearHereLocation)} disabled={busy} className={buttonClass}>
            Dejar de usar este código postal
          </button>
        )}
        {kind === "aqui" && (
          <>
            {loggedIn && here && (
              <button type="button" onClick={() => run(() => saveHomeHere(toForm(here)))} disabled={busy} className={buttonClass}>
                <Home size={26} aria-hidden="true" />
                Estoy en casa: guardar este sitio como mi casa
              </button>
            )}
            <button type="button" onClick={() => run(clearHereLocation)} disabled={busy} className={buttonClass}>
              {hasHome ? "Volver a usar mi casa" : "Dejar de usar mi ubicación"}
            </button>
          </>
        )}

        <form action={cpAction} onSubmit={() => setLast("cp")} className="flex flex-col gap-2">
          <label htmlFor="cp-panel" className="text-xl font-bold">
            {loggedIn ? "O escribe el código postal de tu casa" : "O escribe tu código postal"}
          </label>
          <div className="flex gap-3">
            <input
              id="cp-panel"
              name="codigo_postal"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="28012"
              className={`${bigInputClass} flex-1 tracking-widest`}
            />
            <button type="submit" disabled={busy} className="h-16 shrink-0 rounded-2xl bg-tinta px-5 text-xl font-bold text-white disabled:opacity-60">
              {cpPending ? "…" : "Guardar"}
            </button>
          </div>
        </form>

        {shown.error && <Hint tone="error">{shown.error}</Hint>}
        {shown.ok && <Hint tone="ok">{shown.ok}</Hint>}
        <p className="text-base text-gris">
          Tu ubicación solo se usa para calcular distancias. Si usas «dónde estoy ahora», se queda en este móvil durante 3 horas.
        </p>
      </div>
    </details>
  );
}
