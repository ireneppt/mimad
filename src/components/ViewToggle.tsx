// Interruptor "Lista / Mapa" del Inicio y del Mapa (conserva la búsqueda)
import Link from "next/link";
import { List, Map as MapIcon } from "lucide-react";

export default function ViewToggle({ current, search }: { current: "lista" | "mapa"; search?: string }) {
  const q = search ? `?q=${encodeURIComponent(search)}` : "";
  const cls = (on: boolean) =>
    `flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-base font-medium ${on ? "bg-degradado text-white shadow-md shadow-coral/25" : "text-tinta"}`;
  return (
    <nav aria-label="Vista" className="flex w-fit gap-1 rounded-2xl bg-white p-1 shadow-md">
      <Link href={`/${q}`} aria-current={current === "lista" ? "page" : undefined} className={cls(current === "lista")}>
        <List size={18} aria-hidden="true" /> Lista
      </Link>
      <Link href={`/mapa${q}`} aria-current={current === "mapa" ? "page" : undefined} className={cls(current === "mapa")}>
        <MapIcon size={18} aria-hidden="true" /> Mapa
      </Link>
    </nav>
  );
}
