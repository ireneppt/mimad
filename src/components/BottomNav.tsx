"use client";

// Barra de navegación inferior (diseño inicio.png). "Chats" se sustituye por "Mapa".
// Las cuentas de entidad tienen la suya: Panel, Agenda (sus planes), Publicar, Avisos y Perfil.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { makeT, type Lang } from "@/lib/i18n";
import { Bell, CalendarDays, House, LayoutDashboard, Map, Plus, Sparkles, User, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };

const PERSON: { items: Item[]; center: Item } = {
  items: [
    { href: "/", label: "Explorar", icon: House },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/mapa", label: "Mapa", icon: Map },
    { href: "/perfil", label: "Perfil", icon: User },
  ],
  center: { href: "/asistente", label: "Asistente: pide recomendaciones", icon: Sparkles },
};

const ENTITY: { items: Item[]; center: Item } = {
  items: [
    { href: "/entidad", label: "Panel", icon: LayoutDashboard },
    { href: "/entidad/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/notificaciones", label: "Avisos", icon: Bell },
    { href: "/perfil", label: "Perfil", icon: User },
  ],
  center: { href: "/entidad/nuevo", label: "Publicar un plan", icon: Plus },
};

export default function BottomNav({ variant = "persona", lang }: { variant?: "persona" | "entidad"; lang?: Lang }) {
  const path = usePathname();
  const t = makeT(variant === "persona" ? lang : "es"); // las entidades, en español
  const { items, center } = variant === "entidad" ? ENTITY : PERSON;
  // "/entidad" solo está activo en el panel, no en sus subpáginas
  const isActive = (href: string) => (href === "/" || href === "/entidad" ? path === href : path.startsWith(href));

  const item = ({ href, label, icon: Icon }: Item) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-sm font-medium ${isActive(href) ? "text-coral-texto" : "text-gris"}`}
    >
      <Icon size={26} aria-hidden="true" />
      {t(label)}
    </Link>
  );
  const CenterIcon = center.icon;

  return (
    <nav
      aria-label={t("Principal")}
      className="fixed inset-x-0 bottom-0 z-[1000] mx-auto max-w-[430px] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative flex items-end px-2">
        {items.slice(0, 2).map(item)}
        <div className="flex flex-1 justify-center">
          <Link
            href={center.href}
            aria-label={t(center.label)}
            aria-current={isActive(center.href) ? "page" : undefined}
            className={`-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg ${variant === "entidad" ? "bg-degradado" : "bg-tinta"}`}
          >
            <CenterIcon size={variant === "entidad" ? 32 : 28} aria-hidden="true" />
          </Link>
        </div>
        {items.slice(2).map(item)}
      </div>
    </nav>
  );
}
