import Image from "next/image";
import { Database } from "lucide-react";

// Portada provisional (día 1). Se sustituirá por la pantalla de Inicio.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-crema to-fondo px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <Image src="/icono.svg" alt="" width={144} height={144} priority />
        <h1 className="text-5xl font-bold tracking-tight">
          Mi<span className="text-coral-texto">Mad</span>
        </h1>
        <p className="text-xl text-gris">Madrid, mejor en compañía.</p>
      </div>

      <div className="w-full">
        <p className="text-2xl font-semibold">Estamos construyendo tu ciudad</p>
        <p className="mt-2 text-lg text-gris">
          Muy pronto: planes y actividades cerca de ti para no estar solo.
        </p>
        <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className="bg-degradado h-full w-1/5 rounded-full" />
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-gris">
          <Database size={16} aria-hidden="true" />
          Con datos abiertos de la Comunidad y el Ayuntamiento de Madrid
        </p>
      </div>
    </main>
  );
}
