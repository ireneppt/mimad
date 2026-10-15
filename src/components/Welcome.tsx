"use client";

// Tras crear la cuenta o entrar: sube al principio de la pantalla y saluda.
// Se activa con ?bienvenida=nueva (cuenta recién creada: repite la animación de
// apertura y luego saluda) o ?bienvenida=1 (login o invitado: solo sube arriba).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, X } from "lucide-react";
import { playSplash, SPLASH_DURATION_MS } from "./Splash";

export default function Welcome({ mode, nombre }: { mode?: string; nombre?: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mode) return;
    window.scrollTo({ top: 0 });
    router.replace("/", { scroll: true }); // quita el parámetro de la dirección
    if (mode === "nueva") {
      playSplash();
      // El aviso aparece cuando termina la animación
      setTimeout(() => setVisible(true), SPLASH_DURATION_MS);
    }
  }, [mode, router]);

  // Temporizador aparte: el efecto de arriba se repite al quitar el parámetro
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div role="status" className="aviso-entrada fixed inset-x-0 top-0 z-[1500] mx-auto max-w-[430px] px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-start gap-3 rounded-2xl bg-tinta p-4 text-white shadow-xl">
        <PartyPopper size={26} className="mt-0.5 shrink-0 text-ambar" aria-hidden="true" />
        <p className="flex-1 text-base">
          <strong className="block text-lg">¡Cuenta creada{nombre ? `, ${nombre}` : ""}!</strong>
          Estos son los planes más cerca de ti.
        </p>
        <button type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="-m-1 p-1">
          <X size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
