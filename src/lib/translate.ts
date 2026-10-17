// "Traducir" en el detalle de un plan (versión por defecto, para personas extranjeras).
// Solo en el servidor: usa la clave de Claude. Los datos abiertos solo vienen en español;
// Claude Haiku traduce el título, el horario y la descripción al idioma elegido.
// Cada traducción se guarda una semana (caché de Next/Vercel): si otra persona pide el
// mismo plan en el mismo idioma, no se vuelve a pagar.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { TRANSLATE_LANGUAGES, type TranslateLanguage } from "./languages";

export { TRANSLATE_LANGUAGES, parseLanguage, type TranslateLanguage } from "./languages";
export type Translation = { titulo: string; horario: string | null; descripcion: string | null };

// Haiku: rápido y barato; solo Haiku o Sonnet (como el asistente)
const MODEL = /^claude-(haiku|sonnet)-/.test(process.env.ANTHROPIC_MODEL ?? "") ? process.env.ANTHROPIC_MODEL! : "claude-haiku-5-5";
const MAX_TEXTO = 3000; // descripciones muy largas: se traduce el principio

async function translateNow(eventoId: string, lang: TranslateLanguage): Promise<Translation | null> {
  const { data: e } = await createPublicClient().from("v_eventos").select("titulo, horario, descripcion").eq("id", eventoId).maybeSingle();
  if (!e) return null;
  const idioma = TRANSLATE_LANGUAGES.find((l) => l.id === lang)!.name;
  const original = {
    titulo: String(e.titulo),
    horario: e.horario ? String(e.horario).slice(0, 500) : null,
    descripcion: e.descripcion ? String(e.descripcion).slice(0, MAX_TEXTO) : null,
  };

  const response = await new Anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      `Traduces fichas de actividades de Madrid del español al ${idioma}, para personas extranjeras que acaban de llegar. ` +
      "Traduce con fidelidad y en un lenguaje claro y sencillo. No añadas ni quites información. " +
      "Deja sin traducir los nombres propios de lugares, centros, obras y organizaciones. " +
      "No expliques qué es nada salvo con este glosario (y solo la primera vez, entre paréntesis): " +
      "CEPI = Centro de Participación e Integración, centro público y gratuito de la Comunidad de Madrid para personas migrantes; " +
      "Centro Cultural = centro cultural municipal; Junta Municipal = oficina del Ayuntamiento en el distrito. " +
      "Si un campo es null, devuélvelo null.",
    messages: [{ role: "user", content: JSON.stringify(original) }],
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            horario: { type: ["string", "null"] },
            descripcion: { type: ["string", "null"] },
          },
          required: ["titulo", "horario", "descripcion"],
          additionalProperties: false,
        },
      },
    },
  });
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  console.info(`[traducir] ${response.model} ${lang}: ${response.usage.input_tokens} tokens de entrada, ${response.usage.output_tokens} de salida`);
  const t = JSON.parse(text) as Translation;
  return { titulo: t.titulo, horario: original.horario ? t.horario : null, descripcion: original.descripcion ? t.descripcion : null };
}

// Una semana en caché (por plan e idioma)
// (si se cambian las instrucciones, cambiar la versión de la clave para no reutilizar las de antes)
export const translatePlan = unstable_cache(translateNow, ["traduccion-plan-v2"], { revalidate: 7 * 24 * 3600 });

// Límite por persona (en memoria, como el asistente): para que nadie gaste la clave
const LIMITE_POR_HORA = 30;
const uso = new Map<string, number[]>();

export function translateWithinLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (uso.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= LIMITE_POR_HORA) return false;
  recent.push(now);
  uso.set(userId, recent);
  return true;
}

// Títulos de una lista de planes (los de personas extranjeras en el Inicio): una sola
// llamada por página, guardada una semana. Si falla, se quedan en español.
const translateTitlesNow = async (items: [string, string][], lang: TranslateLanguage): Promise<Record<string, string>> => {
  if (!items.length || !process.env.ANTHROPIC_API_KEY) return {};
  const idioma = TRANSLATE_LANGUAGES.find((l) => l.id === lang)!.name;
  try {
    const response = await new Anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system:
        `Traduces títulos de actividades de Madrid del español al ${idioma}, para personas extranjeras. Traducción fiel, corta y clara. ` +
        "Deja sin traducir los nombres propios (centros, lugares, programas con nombre propio). Devuelve los títulos en el mismo orden.",
      messages: [{ role: "user", content: JSON.stringify(items.map(([, titulo]) => titulo)) }],
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: { type: "object", properties: { titulos: { type: "array", items: { type: "string" } } }, required: ["titulos"], additionalProperties: false },
        },
      },
    });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const { titulos } = JSON.parse(text) as { titulos: string[] };
    console.info(`[traducir] títulos ${lang}: ${items.length} (${response.usage.input_tokens}+${response.usage.output_tokens} tokens)`);
    return Object.fromEntries(items.flatMap(([id], i) => (titulos[i] ? [[id, titulos[i]]] : [])));
  } catch (err) {
    console.error("[traducir] no se han podido traducir los títulos:", err);
    return {};
  }
};

export const translateTitles = unstable_cache(translateTitlesNow, ["traduccion-titulos-v1"], { revalidate: 7 * 24 * 3600 });
