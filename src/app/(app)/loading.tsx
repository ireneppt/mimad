import Image from "next/image";
import { getT } from "@/lib/i18n/server";

// Pantalla de carga (diseño pantalla-carga.png): se ve mientras llegan los datos
export default async function Loading() {
  const t = await getT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-crema to-fondo px-6 py-16 text-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <Image src="/icono.svg" alt="" width={128} height={128} priority />
        <p className="text-5xl font-bold tracking-tight">
          Mi<span className="text-coral-texto">Mad</span>
        </p>
        <p className="text-xl text-gris">{t("Madrid, mejor en compañía.")}</p>
      </div>
      <div className="w-full">
        <p className="text-3xl font-bold">{t("Cargando…")}</p>
        <p className="mt-2 text-lg text-gris">{t("Preparando actividades cerca de ti. Espera un momento, por favor.")}</p>
        <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className="bg-degradado h-full w-1/3 animate-[carga_1.4s_ease-in-out_infinite] rounded-full motion-reduce:w-2/3 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
