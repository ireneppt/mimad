import Link from "next/link";
import { HeartHandshake, LogOut } from "lucide-react";
import UnderConstruction from "@/components/UnderConstruction";
import { logout } from "@/app/(auth)/actions";

export default function ProfilePage() {
  return (
    <UnderConstruction title="Perfil" task="tarea A7">
      {/* Acceso provisional al acompañamiento hasta que esté el perfil (A7) */}
      <Link href="/acompanamiento" className="flex h-12 items-center gap-2 rounded-2xl bg-tinta px-5 text-lg font-medium text-white">
        <HeartHandshake size={20} aria-hidden="true" /> Personas que acompañas
      </Link>
      <form action={logout}>
        <button type="submit" className="flex h-12 items-center gap-2 rounded-2xl border border-slate-300 px-5 text-lg font-medium">
          <LogOut size={20} aria-hidden="true" /> Cerrar sesión
        </button>
      </form>
    </UnderConstruction>
  );
}
