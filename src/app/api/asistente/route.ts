// POST /api/asistente — el chat del Asistente le pregunta aquí.
// Recibe { mensaje, historial } y devuelve planes reales con su "por qué" y su fuente.
// La clave de Claude solo se usa aquí, en el servidor: nunca llega al navegador.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin } from "@/lib/origin";
import { getSources } from "@/lib/data";
import { walkingMinutes } from "@/lib/format";
import { getPendingRecommendations, getMyInscriptionIds, whenInWords } from "@/lib/simplePlans";
import { getCandidates, recommend, windowFromText, type Turno } from "@/lib/assistant";

export type PlanTarjeta = {
  id: string;
  titulo: string;
  cuando: string;
  lugar: string | null;
  minutos: number | null;
  gratis: boolean;
  gusto: string | null;
  porque: string;
  fuente: { nombre: string; organismo: string; url: string } | null;
  apuntada: boolean;
};

export type RespuestaAsistente = { texto: string; planes: PlanTarjeta[]; motor: "claude" | "reglas"; motivo?: string };

const MAX_MENSAJE = 500;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { mensaje?: unknown; historial?: unknown; vistos?: unknown } | null;
  const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim().slice(0, MAX_MENSAJE) : "";
  if (!mensaje) return NextResponse.json({ error: "Escribe qué te apetece." }, { status: 400 });

  const historial: Turno[] = Array.isArray(body?.historial)
    ? body.historial
        .filter((t): t is Turno => (t?.rol === "usuario" || t?.rol === "asistente") && typeof t?.texto === "string")
        .slice(-6)
        .map((t) => ({ rol: t.rol, texto: t.texto.slice(0, MAX_MENSAJE) }))
    : [];

  const vistos = Array.isArray(body?.vistos) ? body.vistos.filter((v): v is string => typeof v === "string").slice(-30) : [];

  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const origin = await getOrigin(perfil);
  const persona = {
    id: perfil?.id ?? null,
    nombre: perfil?.nombre ?? null,
    intereses: perfil?.intereses ?? [],
    simplificada: perfil?.simplificada ?? false,
  };

  // El día sale del mensaje nuevo o, si no lo dice ("¿y algo gratis?"), de la conversación
  const when = windowFromText(mensaje) !== "semana" ? windowFromText(mensaje) : windowFromText(historial.filter((t) => t.rol === "usuario").map((t) => t.texto).join(" "));

  const [recomendaciones, fuentes, inscritos] = await Promise.all([
    perfil ? getPendingRecommendations(supabase, perfil.id) : Promise.resolve([]),
    getSources(),
    perfil ? getMyInscriptionIds(supabase, perfil.id) : Promise.resolve([] as string[]),
  ]);
  const candidatos = await getCandidates(supabase, { home: origin, when, persona, recomendaciones });
  const r = await recommend({ mensaje, historial, vistos, candidatos, persona, origen: origin.kind });

  const respuesta: RespuestaAsistente = {
    texto: r.texto,
    motor: r.motor,
    motivo: r.motivo,
    planes: r.elegidos.map(({ plan, porque }) => {
      const e = plan.evento;
      const f = fuentes[e.fuente];
      return {
        id: e.id,
        titulo: e.titulo,
        cuando: whenInWords(e),
        lugar: e.lugar ?? e.direccion,
        minutos: plan.km != null ? walkingMinutes(plan.km) : null,
        gratis: !!e.gratuito,
        gusto: plan.gusto,
        porque,
        fuente: f ? { nombre: f.nombre, organismo: f.organismo, url: f.url_ficha } : null,
        apuntada: inscritos.includes(e.id),
      };
    }),
  };
  return NextResponse.json(respuesta);
}
