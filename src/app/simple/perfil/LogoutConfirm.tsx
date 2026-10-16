"use client";

// "Salir de MiMad" con confirmación dentro de la pantalla (para no salir sin querer)
import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { PrimarySubmit } from "@/components/simple/ui";
import { logoutSimple } from "./actions";

export default function LogoutConfirm() {
  const [asking, setAsking] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (asking) ref.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-700 bg-white text-xl font-bold text-red-800"
      >
        <LogOut size={26} aria-hidden="true" />
        Salir de MiMad
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-red-700 bg-red-50 p-5">
      <p ref={ref} tabIndex={-1} className="text-xl leading-snug focus:outline-none">
        ¿Seguro que quieres salir? Para volver a entrar necesitarás tu <strong>móvil</strong> y tu <strong>contraseña</strong>.
      </p>
      <form action={logoutSimple}>
        <PrimarySubmit>Sí, salir</PrimarySubmit>
      </form>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="flex h-16 w-full items-center justify-center rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
      >
        No, me quedo
      </button>
    </div>
  );
}
