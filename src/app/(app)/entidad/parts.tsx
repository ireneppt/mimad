// Piezas de las pantallas de entidad: tarjeta de la entidad y fila de un plan
import Link from "next/link";
import { ChevronRight, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import { categoryInfo } from "@/lib/categories";
import { STATUS_LABELS, type EntityEventWithCount } from "@/lib/entityEvents";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export function EntityCard({ nombre, verificada, foto }: { nombre: string; verificada: boolean; foto: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <Avatar url={foto} name={nombre} size={52} />
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{nombre}</p>
        {verificada ? (
          <p className="flex items-center gap-1 text-sm font-medium text-green-800"><ShieldCheck size={15} aria-hidden="true" /> Entidad verificada</p>
        ) : (
          <p className="flex items-center gap-1 text-sm font-medium text-amber-800"><ShieldAlert size={15} aria-hidden="true" /> Pendiente de revisión</p>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ estado }: { estado: EntityEventWithCount["estado"] }) {
  const s = STATUS_LABELS[estado];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
}

// "12 de 20 plazas" con barra, o "12 apuntadas"
export function Attendance({ apuntados, plazas, big = false }: { apuntados: number; plazas: number | null; big?: boolean }) {
  const pct = plazas ? Math.min(100, Math.round((apuntados / plazas) * 100)) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className={`flex items-center gap-1.5 ${big ? "text-xl font-bold" : "text-sm text-gris"}`}>
        <Users size={big ? 22 : 15} className={big ? "text-coral-texto" : ""} aria-hidden="true" />
        {apuntados} {apuntados === 1 ? "persona apuntada" : "personas apuntadas"}
        {plazas ? ` de ${plazas} plazas` : ""}
      </p>
      {pct !== null && (
        <div className={`${big ? "h-3" : "h-1.5"} w-full overflow-hidden rounded-full bg-slate-200`} role="img" aria-label={`${pct} % de las plazas ocupadas`}>
          <div className="bg-degradado h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function EventRow({ e }: { e: EntityEventWithCount }) {
  const { icon: Icon } = categoryInfo(e.categoria);
  const d = new Date(`${e.fecha_inicio.slice(0, 10)}T12:00:00Z`);
  return (
    <li>
      <Link href={`/entidad/eventos/${e.id}`} className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${e.estado === "cancelado" ? "opacity-70" : ""}`}>
        <span className="flex w-12 shrink-0 flex-col items-center leading-none">
          <span className="text-2xl font-bold">{d.getUTCDate()}</span>
          <span className="text-xs font-semibold text-gris">{WEEKDAYS[d.getUTCDay()]} · {MONTHS[d.getUTCMonth()]}</span>
        </span>
        <span className="bg-degradado flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" aria-hidden="true">
          <Icon size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-lg font-semibold leading-tight">{e.titulo}</span>
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill estado={e.estado} />
            <span className="text-sm text-gris">{e.fecha_inicio.slice(11, 16)}</span>
          </span>
          <Attendance apuntados={e.apuntados} plazas={e.plazas} />
        </span>
        <ChevronRight size={22} className="shrink-0 text-gris" aria-hidden="true" />
      </Link>
    </li>
  );
}
