// "Pedir consejo" (versión simplificada): opciones de las dos preguntas y qué planes
// corresponden a cada una. Usa las categorías de los datos abiertos (v_eventos).
import type { Evento } from "./data";
import type { NamedWindow } from "./simplePlans";

export type Que = "pasear" | "aprender" | "musica" | "gente" | "sorpresa";

export const QUE: Record<Que, { label: string; eco: string; categorias: string[]; fuentes?: string[] }> = {
  pasear: {
    label: "Pasear",
    eco: "¡Muy bien, pasear!",
    categorias: ["ExcursionesItinerariosVisitas", "ItinerariosOtrasActividadesAmbientales", "ActividadesCalleArteUrbano", "Exposiciones", "Historia"],
  },
  aprender: {
    label: "Aprender algo",
    eco: "¡Muy bien, aprender algo!",
    categorias: ["CursosTalleres", "ConferenciasColoquios", "CapacitacionDigital", "Idiomas", "ClubesLectura", "RecitalesPresentacionesActosLiterarios", "Literatura", "Historia"],
  },
  musica: {
    label: "Música y baile",
    eco: "¡Muy bien, música y baile!",
    categorias: ["Musica", "Clasica", "Flamenco", "CoroGospel", "JazzSoulFunkySwingReagge", "DanzaBaile", "Zarzuela", "LatinaEspanola", "FolcloreEtnica", "CantautorFolkCountry", "RockPop"],
  },
  gente: {
    label: "Conocer gente",
    eco: "¡Muy bien, conocer gente!",
    categorias: ["ClubesLectura", "Fiestas", "ActosSolidarios", "ComemoracionesHomenajes", "1ciudad21distritos"],
    fuentes: ["juntos_contra_soledad"], // talleres para conocer gente y no sentirse solo
  },
  sorpresa: { label: "Me da igual, sorpréndeme", eco: "¡Vale, te sorprendo!", categorias: [] },
};

export const CUANDO: { id: NamedWindow; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "manana", label: "Mañana" },
  { id: "finde", label: "El fin de semana" },
  { id: "semana", label: "Cualquier día" },
];

export const parseQue = (s?: string): Que | null => (s && s in QUE ? (s as Que) : null);
export const parseCuando = (s?: string): NamedWindow | null => CUANDO.find((c) => c.id === s)?.id ?? null;

// ¿Este plan es del tipo que ha elegido?
export function matchesQue(que: Que, e: Evento): boolean {
  const o = QUE[que];
  if (que === "sorpresa") return true;
  return (e.categoria != null && o.categorias.includes(e.categoria)) || (o.fuentes ?? []).includes(e.fuente);
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "2026-10-17" → "Sábado 17 de octubre"
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d} de ${MONTHS[m - 1]}`;
}
