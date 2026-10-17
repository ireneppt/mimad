// Cabecera del Inicio y del Mapa (diseños inicio.png y mapa.png): logo, "Tu ubicación",
// idioma, campana de avisos, interruptor de versión simplificada, "Recién llegados" (solo
// en Inicio) y buscador.
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Bell, Globe, Search } from "lucide-react";
import LanguageMenu from "@/components/LanguageMenu";
import { LANG_COOKIE, parseLanguage } from "@/lib/languages";
import type { SupabaseClient } from "@supabase/supabase-js";
import LocationChip from "@/components/LocationChip";
import { switchToSimple } from "@/app/(app)/actions";
import type { Perfil } from "@/lib/profile";
import type { OriginKind } from "@/lib/origin";
import { getZones } from "@/lib/zones";

export default async function HomeHeader({
  db, perfil, originKind, zone, search, searchAction, hidden = {}, newcomers,
}: {
  db: SupabaseClient;
  perfil: Perfil | null;
  originKind: OriginKind;
  zone?: string; // zona elegida en "Ver planes en otra zona"
  search: string;
  searchAction: "/" | "/mapa"; // a qué pantalla va el buscador
  hidden?: Record<string, string>; // filtros que se conservan al buscar
  newcomers?: { active: boolean; href: string }; // "Recién llegados" (solo en Inicio)
}) {
  const lang = parseLanguage((await cookies()).get(LANG_COOKIE)?.value);
  const [{ count: unread }, zones] = await Promise.all([
    perfil ? db.from("mm_notificaciones").select("*", { count: "exact", head: true }).eq("leida", false) : Promise.resolve({ count: 0 }),
    getZones(),
  ]);
  const place = [perfil?.municipio ?? "Madrid", perfil?.barrio].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 pb-5 pt-6">
      <header className="relative flex items-center gap-3">
        <Link href="/" aria-label="MiMad, inicio" className="shrink-0">
          <Image src="/icono.svg" alt="" width={56} height={56} priority />
        </Link>
        <LocationChip place={place} kind={originKind} zone={zone} zones={zones.map((z) => z.name)} loggedIn={!!perfil} />
        <LanguageMenu current={lang} />
        <Link
          href="/notificaciones"
          aria-label={unread ? `Notificaciones: ${unread} sin leer` : "Notificaciones"}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100"
        >
          <Bell size={26} aria-hidden="true" />
          {!!unread && <span className="absolute right-3.5 top-3 h-3 w-3 rounded-full border-2 border-slate-100 bg-coral" aria-hidden="true" />}
        </Link>
      </header>

      <form action={switchToSimple}>
        <button type="submit" role="switch" aria-checked="false" className="flex w-full items-center gap-3 rounded-2xl border border-coral/30 bg-coral/5 p-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-coral-texto" aria-hidden="true">Aa</span>
          <span className="flex-1 text-lg font-semibold">Versión simplificada</span>
          <span className="relative h-8 w-14 rounded-full bg-slate-300" aria-hidden="true">
            <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow" />
          </span>
        </button>
      </form>

      {/* Personas extranjeras: actividades de los CEPI (español, trámites, empleo…) */}
      {newcomers && (
        <Link
          href={newcomers.href}
          role="switch"
          aria-checked={newcomers.active}
          scroll={false}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${newcomers.active ? "border-coral bg-coral/10" : "border-slate-200 bg-slate-50"}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-coral-texto" aria-hidden="true">
            <Globe size={22} />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-semibold leading-tight">Recién llegados</span>
            <span className="block text-sm text-gris">Español, trámites y empleo en los CEPI</span>
          </span>
          <span className={`relative h-8 w-14 shrink-0 rounded-full ${newcomers.active ? "bg-degradado" : "bg-slate-300"}`} aria-hidden="true">
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ${newcomers.active ? "right-1" : "left-1"}`} />
          </span>
        </Link>
      )}

      <form action={searchAction} role="search" className="relative">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label htmlFor="buscar" className="sr-only">Buscar actividades</label>
        <Search size={24} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gris" aria-hidden="true" />
        <input
          id="buscar"
          name="q"
          type="search"
          defaultValue={search}
          maxLength={60}
          placeholder="Buscar actividades, talleres…"
          className="h-14 w-full rounded-2xl bg-slate-100 pl-14 pr-4 text-lg placeholder:text-gris focus:outline-none focus:ring-2 focus:ring-tinta"
        />
      </form>
    </div>
  );
}
