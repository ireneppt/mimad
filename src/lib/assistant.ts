// Asistente de recomendaciones (B13). Solo en el servidor: usa la clave de Claude.
//
// 1) Buscamos planes REALES de los datos abiertos cerca de la persona (v_eventos).
// 2) Si hay clave (ANTHROPIC_API_KEY), Claude elige de esa lista los que mejor encajan con
//    lo que ha pedido y explica por qué. Solo puede elegir ids de la lista: no inventa planes.
// 3) Si no hay clave, falla o se pasa del límite de uso, elegimos con reglas sencillas.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAccessible, type Evento } from "./data";
import { walkingMinutes } from "./format";
import { categoriesForInterests, INTERESTS } from "./interests";
import { matchesQue, type Que } from "./consejo";
import { getSimplePlans, whenInWords, whyThisPlan, type Plan, type PlanWindow, type Recomendacion } from "./simplePlans";
import type { OriginKind } from "./origin";

export type Turno = { rol: "usuario" | "asistente"; texto: string };

export type Eleccion = { plan: Plan; porque: string };

export type Respuesta = {
  texto: string;
  elegidos: Eleccion[];
  motor: "claude" | "reglas";
  motivo?: string; // por qué no se ha usado Claude (para que el equipo lo vea sin entrar en Vercel)
};

type Persona = {
  id: string | null; // null = sin cuenta
  nombre: string | null;
  intereses: string[];
  simplificada: boolean;
};

// Modelo de Claude: Haiku (rápido y barato; para elegir 3 planes de una lista basta).
// Se puede cambiar con la variable ANTHROPIC_MODEL, pero solo a un Haiku o un Sonnet:
// si pone otro (Opus, Fable…), se ignora y se usa Haiku.
const DEFAULT_MODEL = "claude-haiku-5-5";
const MODEL = /^claude-(haiku|sonnet)-/.test(process.env.ANTHROPIC_MODEL ?? "") ? process.env.ANTHROPIC_MODEL! : DEFAULT_MODEL;
const MAX_CANDIDATOS = 30;
const MAX_ELEGIDOS = 3;

// ---------------------------------------------------------------------------
// Qué pide la persona (para buscar candidatos y para las reglas)
// ---------------------------------------------------------------------------

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "este finde", "el domingo" → finde; "mañana" → manana; "hoy", "esta tarde" → hoy
export function windowFromText(text: string): PlanWindow {
  const t = plain(text);
  if (/\b(finde|fin de semana|sabado|domingo)\b/.test(t)) return "finde";
  if (/\bmanana\b/.test(t) && !/por la manana|de manana/.test(t)) return "manana";
  if (/\b(hoy|esta tarde|esta noche|ahora)\b/.test(t)) return "hoy";
  return "semana";
}

// Temas que reconocen las reglas (y los botones de ejemplo del chat)
const TEMAS: { re: RegExp; que?: Que; categorias?: string[]; fuentes?: string[]; nombre: string }[] = [
  { re: /\b(aire libre|pasear|paseo|parque|naturaleza|rutas?\b|excursion)/, que: "pasear", nombre: "al aire libre" },
  { re: /\b(taller|aprender|curso|creativ|manualidad)/, que: "aprender", nombre: "para aprender algo" },
  { re: /\b(musica|concierto|baile|bailar|cantar|coros?\b)/, que: "musica", nombre: "de música y baile" },
  { re: /\b(gente|amig|conocer|soledad|me siento sol|charlar)/, que: "gente", nombre: "para conocer gente" },
  { re: /\b(idioma|ingles|frances|aleman|espanol|conversacion|intercambio)/, categorias: ["Idiomas", "Integración"], fuentes: ["cepi_actividades"], nombre: "de idiomas" },
  { re: /\b(teatro|cine\b|pelicula|monologo)/, categorias: INTERESTS.find((i) => i.id === "teatro_cine")!.categories, nombre: "de teatro y cine" },
  { re: /\b(deporte|correr|yoga|gimnasia|bici)/, categorias: INTERESTS.find((i) => i.id === "deporte")!.categories, nombre: "de deporte" },
  { re: /\b(leer|lectura|libro|biblioteca)/, categorias: INTERESTS.find((i) => i.id === "lectura")!.categories, nombre: "de lectura" },
  { re: /\b(exposicion|museo|arte\b|cultura)/, categorias: INTERESTS.find((i) => i.id === "cultura")!.categories, nombre: "de cultura" },
];

function temaDe(text: string) {
  const t = plain(text);
  return TEMAS.find((x) => x.re.test(t)) ?? null;
}

function encajaTema(tema: (typeof TEMAS)[number], e: Evento): boolean {
  if (tema.que) return matchesQue(tema.que, e);
  return (e.categoria != null && (tema.categorias ?? []).includes(e.categoria)) || (tema.fuentes ?? []).includes(e.fuente);
}

// ---------------------------------------------------------------------------
// Candidatos: planes reales cerca que se le pasan a Claude para que elija.
// Lo que PIDE la persona manda sobre sus gustos: si pide un tema (deporte, teatro…),
// los candidatos son de ese tema aunque no esté entre sus intereses. Si no pide
// ninguno, van mezclados: la mitad según sus gustos y la otra mitad de otras cosas.
// ---------------------------------------------------------------------------

// "Otra cosa", "algo diferente", "fuera de mis gustos": no tirar de sus intereses
const PIDE_OTRA_COSA = /(otr[oa]s? (cosas?|tipo|planes)|algo (distinto|diferente|nuevo)|diferentes?|distint[oa]s?|fuera de mis gustos|que no sea|no me interesa|variar|cambiar de)/;

function interleave(a: Plan[], b: Plan[], max: number): Plan[] {
  const out: Plan[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < max && (i < a.length || i < b.length); i++) {
    for (const p of [a[i], b[i]]) {
      if (p && !seen.has(p.evento.id) && out.length < max) {
        seen.add(p.evento.id);
        out.push(p);
      }
    }
  }
  return out;
}

export async function getCandidates(
  db: SupabaseClient,
  opts: {
    home: { lat: number; lon: number };
    when: PlanWindow;
    persona: Persona;
    recomendaciones?: Recomendacion[];
    filter?: (e: Evento) => boolean;
    mensaje?: string; // lo que ha pedido (para buscar planes de ese tema)
    historial?: Turno[];
  }
): Promise<Plan[]> {
  const mensaje = opts.mensaje ?? "";
  const otraCosa = PIDE_OTRA_COSA.test(plain(mensaje));
  // El tema del mensaje o, si es una continuación ("¿y gratis?"), el último que pidió
  const pedidos = (opts.historial ?? []).filter((t) => t.rol === "usuario").map((t) => t.texto).reverse();
  const tema = temaDe(mensaje) ?? (otraCosa ? null : pedidos.map(temaDe).find(Boolean) ?? null);

  const buscar = (intereses: string[], filter?: (e: Evento) => boolean, max = MAX_CANDIDATOS) =>
    getSimplePlans(db, {
      home: opts.home,
      when: opts.when,
      recomendaciones: opts.recomendaciones ?? [],
      intereses,
      filter: (e) => (opts.filter?.(e) ?? true) && (filter?.(e) ?? true),
      max,
      todos: !opts.persona.simplificada,
    });

  if (tema) {
    const delTema = (await buscar(opts.persona.intereses, (e) => encajaTema(tema, e))).filter((p) => encajaTema(tema, p.evento));
    // Si hay pocos de ese tema, se completa con otros para que Claude diga "lo más parecido"
    if (delTema.length >= MAX_ELEGIDOS) return delTema;
    return interleave(delTema, await buscar([]), MAX_CANDIDATOS);
  }
  if (otraCosa && opts.persona.intereses.length) {
    // "Algo diferente": fuera de sus gustos (si casi no hay, de todo)
    const suyos = new Set(categoriesForInterests(opts.persona.intereses));
    const fuera = (e: Evento) => !e.categoria || !suyos.has(e.categoria);
    const distintos = (await buscar([], fuera)).filter((p) => fuera(p.evento));
    return distintos.length >= MAX_ELEGIDOS ? distintos : interleave(distintos, await buscar([]), MAX_CANDIDATOS);
  }
  if (otraCosa || opts.persona.intereses.length === 0) return buscar([]);
  // Sin tema: mitad según sus gustos, mitad de todo (para que Claude pueda salirse de sus gustos)
  const [gustos, todo] = await Promise.all([buscar(opts.persona.intereses), buscar([])]);
  return interleave(gustos, todo, MAX_CANDIDATOS);
}

// ---------------------------------------------------------------------------
// Recomendar
// ---------------------------------------------------------------------------

export async function recommend(opts: {
  mensaje: string;
  historial?: Turno[];
  vistos?: string[]; // ids de planes que ya se le han enseñado en esta conversación
  candidatos: Plan[];
  persona: Persona;
  origen: OriginKind;
}): Promise<Respuesta> {
  const { candidatos } = opts;
  if (candidatos.length === 0) {
    return {
      texto: "No he encontrado planes cerca para esos días. Prueba con «cualquier día» o con otra cosa que te apetezca.",
      elegidos: [],
      motor: "reglas",
    };
  }
  const cached = opts.persona.id ? cache.get(cacheKey(opts.persona.id, opts.mensaje, opts.historial ?? [], opts.vistos ?? [], candidatos)) : undefined;
  if (cached && cached.expira > Date.now()) return cached.respuesta;
  let motivo: string;
  if (!process.env.ANTHROPIC_API_KEY) motivo = "falta la clave de Claude en el servidor";
  else if (!opts.persona.id) motivo = "la IA solo se usa con la sesión iniciada";
  else if (!withinLimit(opts.persona.id)) motivo = "has llegado al límite de preguntas de esta hora";
  else {
    try {
      const r = await askClaude(opts);
      if (r) return r;
      motivo = "Claude no ha elegido ningún plan de la lista";
    } catch (err) {
      console.error("[asistente] Claude no ha respondido, uso las reglas:", err);
      motivo = claudeError(err);
    }
  }
  return { ...byRules(opts), motivo };
}

// El error de Claude dicho en palabras (sin datos de la clave)
function claudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "la clave de Claude no es válida";
  if (err instanceof Anthropic.PermissionDeniedError) return "la clave de Claude no tiene permiso";
  if (err instanceof Anthropic.RateLimitError) return "Claude está ocupado, prueba en un minuto";
  if (err instanceof Anthropic.BadRequestError) return "Claude ha rechazado la petición (revisa el saldo de la cuenta)";
  if (err instanceof Anthropic.APIConnectionError) return "no se ha podido conectar con Claude";
  if (err instanceof Anthropic.APIError) return `error de Claude (${err.status ?? "sin código"})`;
  return "error al preguntar a Claude";
}

// --- Reglas (sin clave o si Claude falla) ----------------------------------

function byRules({ mensaje, historial = [], vistos = [], candidatos, origen }: Parameters<typeof recommend>[0]): Respuesta {
  const t = plain(mensaje);
  // "Solo gratis" después de "Algo al aire libre": sigue siendo al aire libre (el último tema que pidió)
  const pedidos = historial.filter((x) => x.rol === "usuario").map((x) => x.texto).reverse();
  const tema = [mensaje, ...pedidos].map(temaDe).find(Boolean) ?? null;
  // Los que ya ha visto, al final (para "Otros planes")
  let pool = [...candidatos.filter((p) => !vistos.includes(p.evento.id)), ...candidatos.filter((p) => vistos.includes(p.evento.id))];
  const filtros: string[] = [];
  if (tema) pool = pool.filter((p) => encajaTema(tema, p.evento));
  if (/gratis|gratuito|sin pagar|barato/.test(t)) {
    pool = pool.filter((p) => p.evento.gratuito);
    filtros.push("gratis");
  }
  if (/accesible|silla de ruedas|movilidad/.test(t)) {
    pool = pool.filter((p) => isAccessible(p.evento));
    filtros.push("accesibles");
  }
  if (/cerca|al lado|andando/.test(t)) pool = [...pool].sort((a, b) => (a.km ?? 99) - (b.km ?? 99));

  const elegidos = (pool.length ? pool : candidatos).slice(0, MAX_ELEGIDOS).map((plan) => ({
    plan,
    porque: whyThisPlan(plan, { minutes: plan.km != null ? walkingMinutes(plan.km) : null, from: origen }),
  }));
  const que = [tema?.nombre, filtros.join(" y ")].filter(Boolean).join(", ");
  const texto = !pool.length
    ? `No he encontrado planes ${que} cerca, pero estos te pueden gustar:`
    : que
      ? `Te propongo ${elegidos.length === 1 ? "este plan" : "estos planes"} ${que}, cerca de ti:`
      : `Te propongo ${elegidos.length === 1 ? "este plan" : "estos planes"}, según tus gustos y cerca de ti:`;
  return { texto, elegidos, motor: "reglas" };
}

// --- Claude ----------------------------------------------------------------

const SYSTEM = `Eres el asistente de MiMad, una app para combatir la soledad y crear comunidad en la Comunidad de Madrid.
Recomiendas planes y actividades reales sacados de los datos abiertos de la Comunidad y del Ayuntamiento de Madrid.

Reglas:
- Solo puedes recomendar planes de la lista de CANDIDATOS del último mensaje, citándolos por su id exacto. Nunca inventes planes, fechas, lugares ni precios.
- Elige entre 1 y 3 planes que encajen con lo que pide la persona (tema, día, hora, compañía, precio, accesibilidad).
- Lo que pide en el mensaje manda sobre sus gustos: si pide algo que no está entre sus gustos (por ejemplo deporte y le gusta la música), recomiéndale eso. Usa sus gustos solo para decidir cuando no pide nada concreto. Si pide "otra cosa" o "algo diferente", elige planes que NO sean de sus gustos.
- "texto": 1 o 2 frases cercanas, en español y tuteando, que presenten tu elección. Si nada encaja de verdad, dilo con sinceridad y propone lo más parecido.
- "porque" de cada plan: una frase corta (máximo 25 palabras) con motivos que salgan de los datos del candidato: gustos, distancia, horario, gratis, accesible, público...
- Si la persona pregunta algo que no tiene que ver con planes, recuérdale amablemente que solo ayudas a encontrar planes, y elige de todas formas 1 o 2 que le puedan gustar.
- No pidas datos personales.`;

const SYSTEM_SENCILLO = `
La persona usa la versión sencilla de la app (personas mayores o con dificultades): usa palabras muy sencillas y frases muy cortas. Nada de tecnicismos ni de emojis.`;

function describe(p: Plan): string {
  const e = p.evento;
  const datos = [
    `id: ${e.id}`,
    `título: ${e.titulo}`,
    `cuándo: ${whenInWords(e)}`,
    (e.lugar ?? e.direccion) && `dónde: ${e.lugar ?? e.direccion}${e.distrito ? ` (${e.distrito})` : ""}`,
    p.km != null && `a ${walkingMinutes(p.km)} min andando`,
    e.categoria && `categoría: ${e.categoria}`,
    e.publico && `público: ${e.publico}`,
    e.gratuito ? "gratis" : e.precio ? `precio: ${e.precio}` : null,
    isAccessible(e) && "instalación accesible",
    e.idioma && `idioma: ${e.idioma}`,
    p.gusto && `encaja con su gusto: ${p.gusto}`,
    p.recomendadoPor && `se lo ha recomendado su familiar ${p.recomendadoPor}`,
    e.descripcion && `descripción: ${e.descripcion.replace(/\s+/g, " ").slice(0, 200)}`,
  ];
  return `- ${datos.filter(Boolean).join(" | ")}`;
}

async function askClaude({ mensaje, historial = [], vistos = [], candidatos, persona, origen }: Parameters<typeof recommend>[0]): Promise<Respuesta | null> {
  const key = cacheKey(persona.id!, mensaje, historial, vistos, candidatos);
  const gustos = INTERESTS.filter((i) => persona.intereses.includes(i.id)).map((i) => i.label);
  const desde = { aqui: "de donde está ahora", cp: "de su código postal", casa: "de su casa", centro: "del centro de Madrid (no sabemos dónde vive)" }[origen];
  const contexto = [
    `Persona: ${persona.nombre ?? "sin nombre"}. Gustos: ${gustos.length ? gustos.join(", ") : "no los ha indicado"}.`,
    `Las distancias son ${desde}. Hoy es ${new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" })}.`,
    "",
    "CANDIDATOS:",
    ...candidatos.map(describe),
    "",
    ...(vistos.length ? [`Ya le has enseñado estos (no los repitas salvo que te lo pida): ${vistos.join(", ")}`, ""] : []),
    `Lo que pide: ${mensaje}`,
  ].join("\n");

  // Conversación previa (solo texto, las últimas vueltas) y el mensaje nuevo con los candidatos
  const messages: Anthropic.MessageParam[] = [
    ...historial.slice(-6).map((t): Anthropic.MessageParam => ({ role: t.rol === "usuario" ? "user" : "assistant", content: t.texto })),
    { role: "user", content: contexto },
  ];
  while (messages.length && messages[0].role !== "user") messages.shift();

  const ids = candidatos.map((p) => p.evento.id);
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM + (persona.simplificada ? SYSTEM_SENCILLO : ""),
    messages,
    output_config: {
      effort: "low", // tarea sencilla: rápido y barato
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            texto: { type: "string" },
            planes: {
              type: "array",
              items: {
                type: "object",
                properties: { id: { type: "string", enum: ids }, porque: { type: "string" } },
                required: ["id", "porque"],
                additionalProperties: false,
              },
            },
          },
          required: ["texto", "planes"],
          additionalProperties: false,
        },
      },
    },
    // Sin "fallbacks": no queremos que la repita otro modelo (podría ser Opus o Fable).
    // Si Claude no responde bien, se usan las reglas (ver recommend).
  });

  // Para vigilar el gasto en los registros de Vercel (sin datos personales)
  console.info(`[asistente] ${response.model}: ${response.usage.input_tokens} tokens de entrada, ${response.usage.output_tokens} de salida`);
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) return null;
  const out = JSON.parse(text) as { texto: string; planes: { id: string; porque: string }[] };

  // Por si acaso: solo ids de la lista, sin repetir, como mucho 3
  const byId = new Map(candidatos.map((p) => [p.evento.id, p]));
  const seen = new Set<string>();
  const elegidos = out.planes
    .filter((x) => byId.has(x.id) && !seen.has(x.id) && seen.add(x.id))
    .slice(0, MAX_ELEGIDOS)
    .map((x) => ({ plan: byId.get(x.id)!, porque: x.porque.trim() }));
  if (elegidos.length === 0) return null;

  const respuesta: Respuesta = { texto: out.texto.trim(), elegidos, motor: "claude" };
  cache.set(key, { respuesta, expira: Date.now() + 30 * 60_000 });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return respuesta;
}

// --- Cuidar el saldo de la clave ---------------------------------------------
// Misma pregunta con los mismos candidatos en 30 min → misma respuesta, sin volver a pagar.
// Y como mucho 20 preguntas a Claude por persona y hora (después, reglas).

const cache = new Map<string, { respuesta: Respuesta; expira: number }>();

function cacheKey(userId: string, mensaje: string, historial: Turno[], vistos: string[], candidatos: Plan[]): string {
  return JSON.stringify([userId, plain(mensaje.trim()), historial.slice(-6), vistos, candidatos.map((p) => p.evento.id)]);
}

const LIMITE_POR_HORA = 20;
const uso = new Map<string, number[]>();

function withinLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (uso.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= LIMITE_POR_HORA) return false;
  recent.push(now);
  uso.set(userId, recent);
  return true;
}
