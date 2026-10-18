// Días en los que de verdad hay un plan de varios días (para «¿Qué día vas a ir?»).
// La Agenda del Ayuntamiento dice qué días de la semana abre (recurrencia_dias: "TU,WE,TH")
// y qué días cierra (dias_excluidos: "24/12/2026;25/12/2026;"): solo se ofrecen esos días.
// Las demás fuentes no lo traen de forma fiable: se ofrecen todos los días del plan.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Evento } from "./data";
import { pickableRange } from "./simpleAgenda";

const CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]; // getUTCDay(): 0 = domingo
const MAX_DAYS = 90; // como mucho, los próximos 90 días en que hay plan (una lista manejable)

const addDay = (iso: string) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
// "24/12/2026" → "2026-12-24"
const fromDmy = (s: string) => {
  const [d, m, y] = s.trim().split("/").map(Number);
  return d && m && y ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
};

// null si el plan no dura varios días; [] si ya no le queda ningún día
export async function availableDays(db: SupabaseClient, e: Evento): Promise<string[] | null> {
  const range = pickableRange(e);
  if (!range) return null;

  let weekdays: Set<number> | null = null;
  let excluded = new Set<string>();
  if (e.fuente === "agenda_madrid") {
    const { data } = await db
      .from("da_agenda_madrid")
      .select("recurrencia_dias, dias_excluidos")
      .eq("id", e.id.replace(/^agenda_madrid:/, ""))
      .maybeSingle();
    const codes = String(data?.recurrencia_dias ?? "").split(",").map((c) => CODES.indexOf(c.trim().toUpperCase())).filter((i) => i >= 0);
    if (codes.length) weekdays = new Set(codes);
    excluded = new Set(String(data?.dias_excluidos ?? "").split(";").map(fromDmy).filter((x): x is string => !!x));
  }

  const days: string[] = [];
  for (let d = range.from; d <= range.to && days.length < MAX_DAYS; d = addDay(d)) {
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if ((!weekdays || weekdays.has(wd)) && !excluded.has(d)) days.push(d);
  }
  return days;
}
