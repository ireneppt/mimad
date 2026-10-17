// POST /api/traducir — el botón «Traducir» del detalle de un plan pregunta aquí.
// Recibe { evento, idioma } y devuelve { titulo, horario, descripcion } traducidos.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseLanguage, translatePlan, translateWithinLimit } from "@/lib/translate";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { evento?: unknown; idioma?: unknown } | null;
  const evento = typeof body?.evento === "string" ? body.evento.slice(0, 200) : "";
  const idioma = parseLanguage(body?.idioma);
  if (!evento || !idioma) return NextResponse.json({ error: "Elige un idioma." }, { status: 400 });

  // Solo con la sesión iniciada (como el asistente), para no gastar la clave con visitas anónimas
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entra en tu cuenta para traducir." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "La traducción no está disponible ahora mismo." }, { status: 503 });
  if (!translateWithinLimit(user.id)) return NextResponse.json({ error: "Has traducido muchos planes seguidos. Prueba dentro de un rato." }, { status: 429 });

  try {
    const t = await translatePlan(evento, idioma);
    if (!t) return NextResponse.json({ error: "Este plan ya no está." }, { status: 404 });
    return NextResponse.json(t);
  } catch (err) {
    console.error("[traducir] no se ha podido traducir:", err);
    return NextResponse.json({ error: "No se ha podido traducir. Prueba otra vez." }, { status: 502 });
  }
}
