"use client";

// Barra de navegación inferior (diseño inicio.png). "Chats" se sustituye por "Mapa".
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Map, Sparkles, User, type LucideIcon } from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Explorar", icon: House },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function BottomNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const item = ({ href, label, icon: Icon }: (typeof ITEMS)[number]) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-sm font-medium ${
        isActive(href) ? "text-coral-texto" : "text-gris"
      }`}
    >
      <Icon size={26} aria-hidden="true" />
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-[1000] mx-auto max-w-[430px] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative flex items-end px-2">
        {ITEMS.slice(0, 2).map(item)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/asistente"
            aria-label="Asistente: pide recomendaciones"
            aria-current={isActive("/asistente") ? "page" : undefined}
            className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-tinta text-white shadow-lg"
          >
            <Sparkles size={28} aria-hidden="true" />
          </Link>
        </div>
        {ITEMS.slice(2).map(item)}
      </div>
    </nav>
  );
}
