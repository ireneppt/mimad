// Buscador del Inicio y del Mapa: va encima de «Lista / Mapa» (fuera de la cabecera blanca)
import { Search } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function SearchBox({
  search, action, hidden = {}, compact = false,
}: {
  search: string;
  action: "/" | "/mapa"; // a qué pantalla va
  hidden?: Record<string, string>; // filtros que se conservan al buscar
  compact?: boolean; // más bajo (en el mapa, para dejarle sitio)
}) {
  const t = await getT();
  return (
    <form action={action} role="search" className="relative">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="buscar" className="sr-only">{t("Buscar actividades")}</label>
      <Search size={compact ? 16 : 18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gris" aria-hidden="true" />
      <input
        id="buscar"
        name="q"
        type="search"
        defaultValue={search}
        maxLength={60}
        placeholder={t("Buscar actividades, talleres…")}
        className={`${compact ? "h-9 pl-9 text-sm" : "h-11 pl-10 text-base"} w-full rounded-xl bg-white pr-3 shadow-sm ring-1 ring-slate-200 placeholder:text-gris focus:outline-none focus:ring-2 focus:ring-tinta`}
      />
    </form>
  );
}
