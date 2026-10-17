// POST /api/traducir/titulos — el Inicio pide aquí, después de pintarse, los títulos traducidos
// de los planes para personas extranjeras (CEPI, idiomas). Así la página no espera a Claude.
// Recibe { ids, idioma } y devuelve { [id]: título }. No acepta textos: solo ids de planes, y solo
// traduce los de personas extranjeras (para que nadie la use para traducir cualquier cosa).
import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isLanguagePlan, isNewcomerPlan } from "@/lib/newcomers";
import { parseLanguage, translateTitles } from "@/lib/translate";
import type { Evento } from "@/lib/data";

const MAX = 20;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ids?: unknown; idioma?: unknown } | null;
  const idioma = parseLanguage(body?.idioma);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  if (!idioma || !ids.length) return NextResponse.json({});

  const { data } = await createPublicClient().from("v_eventos").select("id, titulo, categoria, fuente").in("id", ids);
  const items = ((data ?? []) as Pick<Evento, "id" | "titulo" | "categoria" | "fuente">[])
    .filter((e) => isNewcomerPlan(e as Evento) || isLanguagePlan(e as Evento))
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) // mismo orden siempre: así se aprovecha la caché
    .map((e): [string, string] => [e.id, e.titulo]);
  return NextResponse.json(await translateTitles(items, idioma));
}
