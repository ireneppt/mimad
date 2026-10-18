// Cabecera del Inicio y del Mapa (diseños inicio.png y mapa.png). Arriba, fija al desplazarse
// y compacta: logo, "Tu ubicación", idioma y campana. Debajo (se va al bajar): los
// interruptores de versión simplificada y "Recién llegados" (este, solo en Inicio).
// El buscador va aparte (SearchBox), encima de «Lista / Mapa».
import Image from "next/image";
import Link from "next/link";
import { Bell, Globe } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import LocationChip from "@/components/LocationChip";
import LanguageMenu from "@/components/LanguageMenu";
import ShrinkOnScroll from "@/components/ShrinkOnScroll";
import CamLogo from "@/components/CamLogo";
import { switchToSimple } from "@/app/(app)/actions";
import { getLang } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import type { Perfil } from "@/lib/profile";
import type { OriginKind } from "@/lib/origin";
import { getZones } from "@/lib/zones";

// Interruptor pequeño (solo dibujo: el botón o enlace que lo contiene dice si está activo)
function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-6 w-10 shrink-0 rounded-full ml-0.5 ${on ? "bg-degradado" : "bg-slate-300"}`} aria-hidden="true">
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${on ? "right-0.5" : "left-0.5"}`} />
    </span>
  );
}

const tile = "flex min-h-14 w-full items-center gap-2 rounded-2xl p-2 pr-2.5 text-left ring-1";

export default async function HomeHeader({
  db, perfil, originKind, zone, newcomers, versionToggle = true,
}: {
  db: SupabaseClient;
  perfil: Perfil | null;
  originKind: OriginKind;
  zone?: string; // zona elegida en "Ver planes en otra zona"
  newcomers?: { active: boolean; href: string }; // "Recién llegados" (solo en Inicio)
  versionToggle?: boolean; // "Versión simplificada" (en el mapa no: ya está en el Inicio y quita sitio al mapa)
}) {
  const [{ count: unread }, zones, lang] = await Promise.all([
    perfil ? db.from("mm_notificaciones").select("*", { count: "exact", head: true }).eq("leida", false) : Promise.resolve({ count: 0 }),
    getZones(),
    getLang(),
  ]);
  const t = makeT(lang);
  const place = [perfil?.municipio ?? "Madrid", perfil?.barrio].filter(Boolean).join(", ");

  return (
    <>
      <ShrinkOnScroll className="sticky top-0 z-[700] flex items-center gap-2.5 border-b border-slate-200/70 bg-white/95 px-5 py-2.5 backdrop-blur transition-[padding] duration-200 data-[compact=true]:py-1.5 data-[compact=true]:shadow-sm">
        <Link href="/" aria-label={t("MiMad, inicio")} className="shrink-0">
          <Image src="/icono.svg" alt="" width={40} height={40} priority className="h-10 w-10 transition-all duration-200 group-data-[compact=true]:h-8 group-data-[compact=true]:w-8" />
        </Link>
        {/* Proyecto junto a la Comunidad de Madrid (más pequeño: la barra es compacta) */}
        <CamLogo height={32} className="gap-2" />
        <LocationChip place={place} kind={originKind} zone={zone} zones={zones.map((z) => z.name)} loggedIn={!!perfil} lang={lang} />
        <LanguageMenu current={lang} />
        <Link
          href="/notificaciones"
          aria-label={unread ? t("Notificaciones: {n} sin leer", { n: unread }) : t("Notificaciones")}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 transition-all duration-200 group-data-[compact=true]:h-9 group-data-[compact=true]:w-9"
        >
          <Bell size={20} aria-hidden="true" />
          {!!unread && <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full border-2 border-slate-100 bg-coral" aria-hidden="true" />}
        </Link>
      </ShrinkOnScroll>

      {(versionToggle || newcomers) && (
      <div className={`grid gap-2 bg-white px-5 pb-4 pt-3 ${versionToggle && newcomers ? "grid-cols-2" : "grid-cols-1"}`}>
        {versionToggle && (
        <form action={switchToSimple}>
          <button type="submit" role="switch" aria-checked="false" className={`${tile} bg-gradient-to-br from-coral/10 to-ambar/10 ring-coral/25`}>
            <span className="bg-degradado flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" aria-hidden="true">Aa</span>
            <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">{t("Versión simplificada")}</span>
            <Switch on={false} />
          </button>
        </form>
        )}
        {/* Personas extranjeras: actividades de los CEPI (español, trámites, empleo…) */}
        {newcomers && (
          <Link
            href={newcomers.href}
            role="switch"
            aria-checked={newcomers.active}
            scroll={false}
            className={`${tile} ${newcomers.active ? "bg-sky-50 ring-sky-500" : "bg-gradient-to-br from-sky-50 to-emerald-50 ring-sky-200"}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-emerald-600 text-white" aria-hidden="true">
              <Globe size={20} />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">{t("Recién llegados")}</span>
            <Switch on={newcomers.active} />
          </Link>
        )}
      </div>
      )}
    </>
  );
}
