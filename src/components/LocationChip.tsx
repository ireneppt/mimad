"use client";

// "Tu ubicación · Madrid, desde tu casa ▾": desde dónde se buscan los planes y se cuentan
// las distancias. Se puede usar dónde estoy ahora, el código postal o ver planes en otra
// zona (un distrito de Madrid o un municipio) sin cambiar la casa del perfil.
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, Home, LoaderCircle, LocateFixed, MapPin, X } from "lucide-react";
import { useMyLocation } from "@/components/useMyLocation";
import { clearHereLocation, clearZone, savePostalCode, setHereLocation, setZone, type LocationState } from "@/lib/locationActions";
import type { OriginKind } from "@/lib/origin";
import { makeT, type Lang } from "@/lib/i18n";

const KIND_LABEL: Record<OriginKind, string> = {
  aqui: "donde estás ahora",
  cp: "tu código postal",
  casa: "tu casa",
  centro: "el centro de Madrid",
};

export default function LocationChip({
  place, kind, zone, zones, loggedIn, lang = "es",
}: {
  place: string;
  kind: OriginKind;
  zone?: string; // zona elegida para ver planes (si hay)
  zones: string[]; // distritos de Madrid y municipios para elegir
  loggedIn: boolean;
  lang?: Lang;
}) {
  const t = makeT(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { locate, asking, error: geoError } = useMyLocation();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<LocationState>({});
  const [cpState, cpAction, cpPending] = useActionState(savePostalCode, {});
  const [zoneState, zoneAction, zonePending] = useActionState(setZone, {});
  const busy = asking || pending || cpPending || zonePending;

  // Código postal o zona guardados: se cierra el panel (la página ya se ha actualizado)
  useEffect(() => {
    if (cpState.ok) setOpen(false);
  }, [cpState]);
  useEffect(() => {
    if (zoneState.ok) setOpen(false);
  }, [zoneState]);

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
    run(async () => {
      await clearZone(); // "dónde estoy" sustituye a la zona elegida
      return setHereLocation(f);
    });
  }

  const shown = message.error ?? geoError ?? cpState.error ?? zoneState.error;

  return (
    <div className="min-w-0 flex-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 max-w-full flex-col items-start text-left">
        <span className="text-xs text-gris group-data-[compact=true]:hidden">{zone ? t("Viendo planes en") : t("Tu ubicación")}</span>
        <span className="flex max-w-full items-center gap-1.5 text-lg font-bold leading-tight">
          <span className="truncate">{zone ?? place}</span>
          {zone ? <Compass size={18} className="shrink-0 text-coral-texto" aria-hidden="true" /> : <MapPin size={18} className="shrink-0 text-coral-texto" aria-hidden="true" />}
        </span>
        <span className="truncate text-xs text-gris group-data-[compact=true]:hidden">{zone ? t("Toca para volver a tu ubicación") : t("Distancias desde {lugar}", { lugar: t(KIND_LABEL[kind]) })}</span>
      </button>

      {open && (
        <div className="absolute inset-x-4 top-full z-[600] mt-2 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          {zone && (
            <button type="button" onClick={() => run(clearZone)} disabled={busy} className="bg-degradado flex h-12 items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-60">
              <X size={18} aria-hidden="true" /> {t("Dejar de ver {zona} · volver a mi ubicación", { zona: zone })}
            </button>
          )}

          {/* Ver planes en otra zona: no cambia la casa */}
          <form action={zoneAction} className="flex flex-col gap-2">
            <label htmlFor="zona" className="flex items-center gap-2 text-base font-semibold">
              <Compass size={18} className="text-coral-texto" aria-hidden="true" /> {t("Ver planes en otra zona")}
            </label>
            <div className="flex gap-2">
              <input
                id="zona"
                name="zona"
                list="zonas"
                maxLength={80}
                placeholder={t("Distrito o municipio")}
                autoComplete="off"
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base"
              />
              <button type="submit" disabled={busy} className="h-12 rounded-xl bg-tinta px-4 font-medium text-white disabled:opacity-60">
                {zonePending ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : t("Ver")}
              </button>
            </div>
            <datalist id="zonas">{zones.map((z) => <option key={z} value={z} />)}</datalist>
            <p className="text-xs text-gris">{t("Por ejemplo «Chamberí» o «Alcalá de Henares». No cambia tu casa y se quita sola en 3 horas.")}</p>
          </form>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
            <p className="text-base font-semibold">{t("O cuenta las distancias desde…")}</p>
            <button type="button" onClick={useHere} disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 font-medium disabled:opacity-60">
              {asking ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={20} aria-hidden="true" />}
              {t("Dónde estoy ahora")}
            </button>
            <form action={cpAction} className="flex gap-2">
              <label htmlFor="cp-inicio" className="sr-only">{t("Código postal")}</label>
              <input
                id="cp-inicio"
                name="codigo_postal"
                inputMode="numeric"
                maxLength={5}
                pattern="28[0-9]{3}"
                placeholder={t("Código postal (28…)")}
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base"
              />
              <button type="submit" disabled={busy} className="h-12 rounded-xl bg-tinta px-4 font-medium text-white disabled:opacity-60">
                {loggedIn ? t("Guardar") : t("Usar")}
              </button>
            </form>
            {!zone && (kind === "aqui" || kind === "cp") && (
              <button type="button" onClick={() => run(clearHereLocation)} disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl text-base font-medium text-coral-texto">
                <Home size={18} aria-hidden="true" /> {loggedIn ? t("Volver a usar mi casa") : t("Quitar ubicación")}
              </button>
            )}
            {loggedIn && <p className="text-xs text-gris">{t("El código postal se guarda como tu casa. «Dónde estoy ahora» solo dura 3 horas y no se guarda.")}</p>}
          </div>
          {shown && <p role="alert" className="text-sm text-red-800">{shown}</p>}
        </div>
      )}
    </div>
  );
}
