"use client";

// "Tu ubicación · Madrid, desde tu casa ▾": desde dónde se cuentan las distancias.
// Versión por defecto del panel de ubicación (mismas acciones que la versión simplificada).
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { useMyLocation } from "@/components/useMyLocation";
import { clearHereLocation, savePostalCode, setHereLocation, type LocationState } from "@/lib/locationActions";
import type { OriginKind } from "@/lib/origin";

const KIND_LABEL: Record<OriginKind, string> = {
  aqui: "donde estás ahora",
  cp: "tu código postal",
  casa: "tu casa",
  centro: "el centro de Madrid",
};

export default function LocationChip({ place, kind, loggedIn }: { place: string; kind: OriginKind; loggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { locate, asking, error: geoError } = useMyLocation();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<LocationState>({});
  const [cpState, cpAction, cpPending] = useActionState(savePostalCode, {});
  const busy = asking || pending || cpPending;

  // Código postal guardado: se cierra el panel (la página ya se ha actualizado)
  useEffect(() => {
    if (cpState.ok) setOpen(false);
  }, [cpState]);

  const run = (action: () => Promise<LocationState>) =>
    startTransition(async () => {
      const r = await action();
      setMessage(r);
      if (!r.error) {
        setOpen(false);
        router.refresh();
      }
    });

  async function useHere() {
    const p = await locate();
    if (!p) return;
    const f = new FormData();
    f.set("lat", String(p.lat));
    f.set("lon", String(p.lon));
    run(() => setHereLocation(f));
  }

  const shown = message.error ?? geoError ?? cpState.error;

  return (
    <div className="min-w-0 flex-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-col items-start text-left">
        <span className="text-sm text-gris">Tu ubicación</span>
        <span className="flex max-w-full items-center gap-1.5 text-xl font-bold leading-tight">
          <span className="truncate">{place}</span>
          <MapPin size={20} className="shrink-0 text-coral-texto" aria-hidden="true" />
        </span>
        <span className="text-xs text-gris">Distancias desde {KIND_LABEL[kind]}</span>
      </button>

      {open && (
        <div className="absolute inset-x-4 top-full z-[600] mt-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-base font-semibold">¿Desde dónde contamos las distancias?</p>
          <button type="button" onClick={useHere} disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 font-medium disabled:opacity-60">
            {asking ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={20} aria-hidden="true" />}
            Usar dónde estoy ahora
          </button>
          <form action={cpAction} className="flex gap-2">
            <label htmlFor="cp-inicio" className="sr-only">Código postal</label>
            <input
              id="cp-inicio"
              name="codigo_postal"
              inputMode="numeric"
              maxLength={5}
              pattern="28[0-9]{3}"
              placeholder="Código postal (28…)"
              className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base"
            />
            <button type="submit" disabled={busy} className="h-12 rounded-xl bg-tinta px-4 font-medium text-white disabled:opacity-60">
              {loggedIn ? "Guardar" : "Usar"}
            </button>
          </form>
          {kind === "aqui" || kind === "cp" ? (
            <button type="button" onClick={() => run(clearHereLocation)} disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl text-base font-medium text-coral-texto">
              <Home size={18} aria-hidden="true" /> {loggedIn ? "Volver a usar mi casa" : "Quitar ubicación"}
            </button>
          ) : null}
          {loggedIn && <p className="text-xs text-gris">El código postal se guarda como tu casa. «Dónde estoy ahora» solo dura 3 horas y no se guarda.</p>}
          {shown && <p role="alert" className="text-sm text-red-800">{shown}</p>}
        </div>
      )}
    </div>
  );
}
