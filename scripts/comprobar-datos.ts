// Comprueba los datos y la seguridad usando la clave PÚBLICA, igual que la app.
// Uso: npm run comprobar
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { checkUsers } from "./comprobar-usuarios";

config({ path: ".env.local", quiet: true });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function count(table: string, column?: string, value?: string) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (column && value) q = q.eq(column, value);
  const { count, error } = await q;
  return error ? `ERROR: ${error.message}` : count;
}

async function main() {
  let ok = true;
  const check = (label: string, passed: boolean, detail: unknown) => {
    if (!passed) ok = false;
    console.log(`${passed ? "✔" : "✘"} ${label}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  };

  console.log("DATOS");
  const { data: fuentes } = await db.from("da_fuentes").select("id, filas, ultima_carga, ultimo_error");
  // "entidad" son los planes que publican las entidades en MiMad: no se descarga de ningún portal
  for (const f of (fuentes ?? []).filter((x) => x.id !== "entidad")) {
    check(f.id, !f.ultimo_error && (f.filas ?? 0) > 0, f.ultimo_error ?? `${f.filas} filas, cargado ${f.ultima_carga}`);
  }
  for (const fuente of ["agenda_madrid", "juntos_contra_soledad", "cepi_actividades"]) {
    const n = await count("v_eventos", "fuente", fuente);
    check(`v_eventos de ${fuente}`, typeof n === "number" && n > 0, String(n));
  }
  const lugares = await count("v_lugares");
  check("v_lugares", typeof lugares === "number" && lugares > 0, String(lugares));

  const { data: cats } = await db.from("v_lugares").select("categoria");
  const porCategoria: Record<string, number> = {};
  cats?.forEach((r) => (porCategoria[r.categoria] = (porCategoria[r.categoria] ?? 0) + 1));
  console.log("  lugares por categoría:", porCategoria);

  console.log("\nSEGURIDAD");
  const directa = await db.from("da_centros_atencion_social").select("numero_registro").limit(1);
  check("La app NO puede leer el registro de atención social", !!directa.error, directa.error?.message ?? "¡se puede leer!");

  const escritura = await db.from("da_agenda_madrid").delete().eq("id", "no-existe").select();
  check("La app NO puede escribir en tablas da_*", !!escritura.error, escritura.error?.message ?? "¡se puede escribir!");

  const { data: sensibles } = await db
    .from("v_lugares")
    .select("nombre")
    // (los centros de día dentro de una residencia sí se muestran: su subtipo es centro de día)
    .or("nombre.ilike.%maltrat%,nombre.ilike.%acogida%,nombre.ilike.%albergue%,nombre.ilike.%menores%");
  check("Sin centros sensibles en v_lugares", (sensibles ?? []).length === 0, (sensibles ?? []).map((r) => r.nombre));

  const nifOk = await db.rpc("verificar_nif", { nif: "G28727261" });
  check("verificar_nif reconoce un NIF registrado", nifOk.data?.[0]?.verificada === true, nifOk.data?.[0] ?? nifOk.error?.message);
  const nifNo = await db.rpc("verificar_nif", { nif: "X0000000Z" });
  check("verificar_nif rechaza un NIF inventado", nifNo.data?.[0]?.verificada === false, nifNo.data?.[0] ?? nifNo.error?.message);

  console.log("\nUSUARIOS (cuentas de prueba temporales)");
  await checkUsers(check);

  console.log(ok ? "\nTodo correcto" : "\nHay comprobaciones fallidas");
  process.exit(ok ? 0 : 1);
}

main();
