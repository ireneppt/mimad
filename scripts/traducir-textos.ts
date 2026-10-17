// Genera las traducciones de los textos fijos de la versión por defecto (personas extranjeras).
//
//   npm run traducir-textos
//
// 1) Busca en el código los textos en español que se traducen: las llamadas t("…") y las
//    etiquetas de algunas listas (categorías, intereses, grupos de "Recién llegados"…).
// 2) Los que aún no están en src/lib/i18n/mensajes.json se mandan a Claude (Sonnet, para que
//    la traducción sea buena; se hace una sola vez y se guarda en el repositorio).
// 3) Guarda mensajes.json. Los textos que ya no se usan se quitan.
//
// Necesita ANTHROPIC_API_KEY en .env.local. Se puede repetir sin miedo: solo traduce lo nuevo.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { TRANSLATE_LANGUAGES } from "../src/lib/languages";

config({ path: ".env.local", quiet: true });

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src/lib/i18n/mensajes.json");
const MODEL = "claude-sonnet-5-5";
const BATCH = 40;

// Archivos con listas cuyas etiquetas se traducen con t(variable)
const LIST_FILES = [
  "src/lib/categories.ts",
  "src/lib/interests.ts",
  "src/lib/newcomers.ts",
  "src/app/(app)/page.tsx",
  "src/components/BottomNav.tsx",
];
// Diccionarios (const NOMBRE = { clave: "texto" }) cuyos valores se traducen
const MAP_NAMES = ["KIND_LABEL", "FROM_LABEL", "LANGUAGES", "AUDIENCE"];
const MAP_FILES = ["src/components/LocationChip.tsx", "src/app/(app)/evento/[id]/page.tsx"];
// Mensajes de error de las rutas que el navegador traduce con t(data.error)
const ERROR_FILES = ["src/app/api/traducir/route.ts"];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(d.name) ? [p] : [];
  });
}

const unescape = (s: string) => s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

function collect(): string[] {
  const keys = new Set<string>();
  const add = (s: string) => {
    const v = unescape(s).trim();
    if (v && /[a-záéíóúñ]/i.test(v)) keys.add(v);
  };
  // t("…") en todo src (también t(\n "…"))
  for (const file of walk(path.join(ROOT, "src"))) {
    const code = fs.readFileSync(file, "utf8");
    for (const m of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)+)"/g)) add(m[1]);
    // t(cond ? "a" : "b")
    for (const m of code.matchAll(/\bt\(\s*[\w.!&|() ]+\?\s*"((?:[^"\\]|\\.)+)"\s*:\s*[\w.!&|() ]*\?\s*"((?:[^"\\]|\\.)+)"\s*:\s*"((?:[^"\\]|\\.)+)"/g)) [m[1], m[2], m[3]].forEach(add);
  }
  for (const rel of LIST_FILES) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const m of code.matchAll(/\b(?:label|title)\s*:\s*"((?:[^"\\]|\\.)+)"/g)) add(m[1]);
  }
  for (const rel of MAP_FILES) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const name of MAP_NAMES) {
      const block = code.match(new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\};`));
      if (block) for (const m of block[1].matchAll(/:\s*"((?:[^"\\]|\\.)+)"/g)) add(m[1]);
    }
  }
  for (const rel of ERROR_FILES) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const m of code.matchAll(/error:\s*"((?:[^"\\]|\\.)+)"/g)) add(m[1]);
  }
  return [...keys].sort((a, b) => a.localeCompare(b, "es"));
}

type Messages = Record<string, Record<string, string>>;

async function translate(client: Anthropic, texts: string[]): Promise<Record<string, string[]>> {
  const langs = TRANSLATE_LANGUAGES.map((l) => `${l.id} (${l.name})`).join(", ");
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system:
      "Traduces los textos de la interfaz de MiMad, una app de la Comunidad de Madrid para encontrar planes y actividades y no sentirse solo. " +
      "Los leen sobre todo personas extranjeras que acaban de llegar: usa un lenguaje claro, cercano y corto (son botones, filtros y avisos), tuteando donde el idioma lo permita. " +
      "Reglas: conserva exactamente los marcadores entre llaves ({lugar}, {n}…); no traduzcas MiMad, CEPI, Google Maps, Madrid ni los nombres de lugares; " +
      "mantén la puntuación final y las comillas «» adaptadas al idioma. Devuelve cada lista en el mismo orden que la entrada.",
    messages: [{ role: "user", content: `Traduce al ${langs}:\n${JSON.stringify(texts)}` }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: Object.fromEntries(TRANSLATE_LANGUAGES.map((l) => [l.id, { type: "array", items: { type: "string" } }])),
          required: TRANSLATE_LANGUAGES.map((l) => l.id),
          additionalProperties: false,
        },
      },
    },
  });
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  console.log(`  ${texts.length} textos (${response.usage.input_tokens} + ${response.usage.output_tokens} tokens)`);
  return JSON.parse(text);
}

async function main() {
  const keys = collect();
  // npm run traducir-textos -- --lista: solo enseña los textos encontrados (no traduce)
  if (process.argv.includes("--lista")) {
    console.log(keys.join("\n"));
    return;
  }
  const old: Messages = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const complete = (k: string) => TRANSLATE_LANGUAGES.every((l) => old[k]?.[l.id]);
  const missing = keys.filter((k) => !complete(k));
  console.log(`${keys.length} textos en el código; ${missing.length} sin traducir`);

  const out: Messages = Object.fromEntries(keys.filter(complete).map((k) => [k, old[k]]));
  if (missing.length) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
    const client = new Anthropic();
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const r = await translate(client, batch);
      batch.forEach((k, j) => {
        out[k] = Object.fromEntries(TRANSLATE_LANGUAGES.map((l) => [l.id, r[l.id]?.[j] ?? ""]).filter(([, v]) => v));
      });
    }
  }
  // Ordenado por el texto en español, para que los cambios se lean bien en git
  const sorted = Object.fromEntries(Object.keys(out).sort((a, b) => a.localeCompare(b, "es")).map((k) => [k, out[k]]));
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Guardado ${path.relative(ROOT, OUT)} (${Object.keys(sorted).length} textos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
