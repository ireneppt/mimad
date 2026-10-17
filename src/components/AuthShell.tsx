// Cabecera común de "Iniciar sesión" y "Crear cuenta" (diseños inicio-sesion.png y crear-cuenta.png)
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { enterAsGuest } from "@/app/(auth)/actions";
import CamLogo from "./CamLogo";

export default function AuthShell({ tab, children }: { tab: "login" | "registro"; children: ReactNode }) {
  const tabClass = (active: boolean) =>
    `flex h-14 flex-1 items-center justify-center rounded-2xl text-lg font-medium ${
      active ? "bg-slate-100 shadow-sm" : "text-tinta hover:bg-slate-50"
    }`;

  return (
    <main className="flex min-h-dvh flex-col gap-8 bg-fondo px-5 pb-10 pt-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Logo de MiMad y, más discreto, el de la Comunidad de Madrid */}
        <div className="flex items-center gap-4">
          <Image src="/icono.svg" alt="" width={120} height={120} priority />
          <CamLogo height={84} className="gap-4" />
        </div>
        <p className="text-4xl font-bold tracking-tight">
          Mi<span className="text-coral-texto">Mad</span>
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-balance">Madrid, mejor en compañía.</h1>
        <p className="text-lg text-gris">Encuentra actividades, comparte intereses y conoce a tu comunidad.</p>
      </div>

      <nav className="flex gap-2" aria-label="Acceso">
        <Link href="/login" className={tabClass(tab === "login")} aria-current={tab === "login" ? "page" : undefined}>
          Iniciar sesión
        </Link>
        <Link href="/registro" className={tabClass(tab === "registro")} aria-current={tab === "registro" ? "page" : undefined}>
          Crear cuenta
        </Link>
      </nav>

      {children}

      <form action={enterAsGuest} className="flex justify-center">
        <button type="submit" className="text-lg font-medium text-coral-texto">
          Entrar como invitado →
        </button>
      </form>

      <Link
        href="/simple/login"
        className="flex h-20 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-medium shadow-sm"
      >
        Versión simplificada
      </Link>

      <p className="text-center text-sm text-gris">Prototipo para DataMad 2026 · Actividades de datos abiertos reales</p>
    </main>
  );
}
