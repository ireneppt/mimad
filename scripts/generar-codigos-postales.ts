// Genera src/data/codigos-postales.json: posición aproximada (centro) de cada código
// postal de la Comunidad de Madrid, calculada con datos abiertos que ya carga MiMad:
//   - Registro de centros de atención social (Comunidad de Madrid): toda la región.
//   - Agenda de actividades (Ayuntamiento de Madrid): más puntos en Madrid capital.
// Se usa para situar la casa de una persona a partir de su código postal, sin
// depender de ningún servicio externo.
//
// Privacidad: NO se usan los centros de acogida (mujeres maltratadas, menores,
// albergues…): su ubicación protege a personas en riesgo.
//
// Uso: npm run codigos-postales  (necesita SUPABASE_SERVICE_ROLE_KEY en .env.local)
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { writeFileSync } from "node:fs";

config({ path: ".env.local", quiet: true });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type Point = { cp: string; municipio: string; lat: number; lon: number };

// Lee una tabla entera en páginas de 1.000 filas (límite de Supabase)
async function readAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

const PROTECTED = /ACOGIDA|MALTRATADA|MENORES|ALBERGUE|VIOLENCIA|EMERGENCIA/i;
const validCp = (cp: unknown): cp is string => typeof cp === "string" && /^28\d{3}$/.test(cp.trim());

async function main() {
  type Centro = { tipo: string | null; subtipo: string | null; codigo_postal: string | null; municipio_nombre: string; lat: number | null; lon: number | null };
  type Agenda = { codigo_postal: string | null; localidad: string | null; lat: number | null; lon: number | null };

  const centros = await readAll<Centro>("da_centros_atencion_social", "tipo, subtipo, codigo_postal, municipio_nombre, lat, lon");
  const agenda = await readAll<Agenda>("da_agenda_madrid", "codigo_postal, localidad, lat, lon");

  const points: Point[] = [
    ...centros
      .filter((c) => !PROTECTED.test(`${c.tipo ?? ""} ${c.subtipo ?? ""}`))
      .filter((c) => validCp(c.codigo_postal) && c.lat != null && c.lon != null)
      .map((c) => ({ cp: c.codigo_postal!.trim(), municipio: c.municipio_nombre, lat: c.lat!, lon: c.lon! })),
    ...agenda
      .filter((a) => validCp(a.codigo_postal) && a.lat != null && a.lon != null)
      .map((a) => ({ cp: a.codigo_postal!.trim(), municipio: "Madrid", lat: a.lat!, lon: a.lon! })),
  ];

  // Centro de cada código postal = media de sus puntos; el municipio, el más repetido
  const groups = new Map<string, Point[]>();
  for (const p of points) groups.set(p.cp, [...(groups.get(p.cp) ?? []), p]);

  const codigos: Record<string, { municipio: string; lat: number; lon: number }> = {};
  for (const [cp, ps] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const counts = new Map<string, number>();
    ps.forEach((p) => counts.set(p.municipio, (counts.get(p.municipio) ?? 0) + 1));
    const municipio = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    const avg = (k: "lat" | "lon") => Math.round((ps.reduce((s, p) => s + p[k], 0) / ps.length) * 10_000) / 10_000;
    codigos[cp] = { municipio, lat: avg("lat"), lon: avg("lon") };
  }

  const out = {
    descripcion: "Centro aproximado de cada código postal de la Comunidad de Madrid (generado con scripts/generar-codigos-postales.ts)",
    fuentes: [
      "Registro de centros de atención social · Comunidad de Madrid (sin centros de acogida)",
      "Agenda de actividades y eventos · Ayuntamiento de Madrid",
    ],
    generado: new Date().toISOString().slice(0, 10),
    codigos,
  };
  writeFileSync("src/data/codigos-postales.json", JSON.stringify(out, null, 1) + "\n");
  console.log(`${Object.keys(codigos).length} códigos postales a partir de ${points.length} puntos`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
