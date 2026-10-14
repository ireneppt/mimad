// Carga de datos abiertos en Supabase.
//
// Uso:
//   npm run ingest                         → todas las fuentes
//   npm run ingest -- agenda_madrid        → solo las indicadas (ids de da_fuentes)
//   npm run ingest -- --prueba             → descarga y transforma, pero NO guarda nada
//
// Si una fuente falla, se registra el error y se sigue con las demás.
import { config } from "dotenv";
import { replaceTable, supabaseAdmin } from "./lib";
import { SOURCES } from "./sources";

config({ path: ".env.local", quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--prueba");
  const wanted = args.filter((a) => !a.startsWith("--"));
  const sources = wanted.length ? SOURCES.filter((s) => wanted.includes(s.id)) : SOURCES;
  if (wanted.length && sources.length !== wanted.length) {
    console.error(`Fuentes desconocidas. Disponibles: ${SOURCES.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  const db = dryRun ? null : supabaseAdmin();
  let failures = 0;

  for (const source of sources) {
    const started = Date.now();
    const loadedAt = new Date().toISOString();
    try {
      const rows = await source.load(source.url);
      if (db) {
        await replaceTable(db, source.table, source.key, rows, loadedAt);
        await db
          .from("da_fuentes")
          .update({ ultima_carga: loadedAt, filas: rows.length, ultimo_error: null })
          .eq("id", source.id);
      } else {
        console.log(JSON.stringify(rows[0], null, 2));
      }
      console.log(`✔ ${source.id}: ${rows.length} filas (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    } catch (e) {
      failures++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`✘ ${source.id}: ${message}`);
      await db?.from("da_fuentes").update({ ultimo_error: message }).eq("id", source.id);
    }
  }

  if (failures) {
    console.error(`\n${failures} fuente(s) con errores`);
    process.exit(1);
  }
}

main();
