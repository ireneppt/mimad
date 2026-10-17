// Planes para personas extranjeras: "Recién llegados" (actividades de los CEPI, centros de
// participación e integración de la Comunidad de Madrid) e "Idiomas" (clases y grupos de
// conversación). Los datos de los CEPI no traen el tipo de actividad con detalle: se deduce
// del título, que es muy claro ("Español A2", "Orientación jurídica", "Inglés para el empleo").
import { Briefcase, FileText, Languages, Users, type LucideIcon } from "lucide-react";
import type { Evento } from "./data";

export type NewcomerGroup = "espanol" | "tramites" | "empleo" | "convivencia";

export const NEWCOMER_GROUPS: { id: NewcomerGroup; label: string; icon: LucideIcon }[] = [
  { id: "espanol", label: "Aprender español", icon: Languages },
  { id: "tramites", label: "Trámites y orientación", icon: FileText },
  { id: "empleo", label: "Empleo y formación", icon: Briefcase },
  { id: "convivencia", label: "Convivencia y ocio", icon: Users },
];

export const parseNewcomerGroup = (s?: string): NewcomerGroup | null =>
  NEWCOMER_GROUPS.find((g) => g.id === s)?.id ?? null;

// Categorías donde buscar (para no traer toda la agenda): las de integración y las de cursos
export const NEWCOMER_CATEGORIES = ["Integración"];
export const LANGUAGE_CATEGORIES = ["Idiomas", "Integración", "CursosTalleres"];

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// En orden: lo de la nacionalidad (CCSE, DELE para la nacionalidad) va a trámites, aunque sea de español
const GROUP_RULES: { id: NewcomerGroup; re: RegExp }[] = [
  { id: "tramites", re: /\b(orientacion (social|juridica)|leyes|ccse|nacionalidad|homologacion|tramites?|extranjeria|regularizacion|derechos|acogida|asesoramiento|solicitud(es)?|informes? de integracion)\b/ },
  { id: "espanol", re: /\b(espanol|castellano|alfabetizacion|lectoescritura|dele)\b/ },
  { id: "empleo", re: /\b(empleo|laboral|ofimatica|manipulador|cuidado|cuidar|domiciliaria|curriculum|cv|carta de presentacion|digital|google|ia|informatica|mecanografia|teclado|excel|word|entrevistas?|profesionalidad)\b/ },
];

// "Recién llegados": las actividades de los CEPI y lo que la agenda clasifica como integración
export function isNewcomerPlan(e: Evento): boolean {
  return e.fuente === "cepi_actividades" || e.categoria === "Integración";
}

export function newcomerGroup(e: Evento): NewcomerGroup {
  const t = plain(e.titulo);
  return GROUP_RULES.find((r) => r.re.test(t))?.id ?? "convivencia";
}

// "Idiomas": clases de un idioma ("Español A2", "Inglés para el empleo", "Taller de francés")
// y grupos de conversación o intercambio
const LANGUAGE = "(espanol|ingles|frances|aleman|italiano|portugues|chino|arabe|japones|ruso|rumano|ucraniano)";
const LANGUAGE_RULES = [
  new RegExp(`\\b${LANGUAGE}\\b.{0,40}\\b(a1|a2|b1|b2|c1|basico|intermedio|avanzado|nivel|para|curso|clase|conversacion)`),
  new RegExp(`\\b(curso|clases?|taller|club|grupo|aprende|aprender)\\b.{0,20}\\b${LANGUAGE}\\b`),
  /\b(idiomas?|intercambio de idiomas|language exchange|club de conversacion|english)\b/,
];

export function isLanguagePlan(e: Evento): boolean {
  if (e.categoria === "Idiomas") return true;
  const t = plain(e.titulo);
  return LANGUAGE_RULES.some((re) => re.test(t));
}
