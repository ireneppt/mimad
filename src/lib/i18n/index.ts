// Textos fijos de la versión por defecto en otros idiomas (personas extranjeras).
// La clave es el texto en español: t("Gratis") → "Free". Si un texto no está traducido,
// se queda en español. Las traducciones están en mensajes.json y se generan con
// `npm run traducir-textos` (busca en el código los t("…") y las etiquetas de las listas).
import mensajes from "./mensajes.json";
import type { TranslateLanguage } from "../languages";

export type Lang = "es" | TranslateLanguage;
export type T = (es: string, vars?: Record<string, string | number>) => string;

const M = mensajes as Record<string, Partial<Record<TranslateLanguage, string>>>;

export function makeT(lang: Lang | null | undefined): T {
  return (es, vars) => {
    const text = (lang && lang !== "es" && M[es]?.[lang]) || es;
    return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;
  };
}
