// "Añadir al calendario del móvil": descarga el plan como archivo .ics
// (lo abren el calendario de Android, iPhone, Outlook...)
import { createClient } from "@/lib/supabase/server";
import { getEvent } from "@/lib/data";

// "2026-10-23T17:00:00" → "20261023T170000"
const icsDate = (s: string) => s.replace(/[-:]/g, "").replace(" ", "T").slice(0, 15);
const icsDay = (s: string) => s.slice(0, 10).replace(/-/g, "");
// Texto en .ics: escapar comas, puntos y comas y saltos de línea
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const evento = await getEvent(supabase, decodeURIComponent(id));
  if (!evento?.fecha_inicio) return new Response("Este plan no tiene fecha concreta", { status: 404 });

  // ?dia=: el día que eligió al apuntarse a un plan de varios días (solo si está dentro del plan)
  const dia = new URL(request.url).searchParams.get("dia");
  const inRange = !!dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia >= evento.fecha_inicio.slice(0, 10) && dia <= (evento.fecha_fin ?? evento.fecha_inicio).slice(0, 10);
  const start = inRange ? dia! : evento.fecha_inicio;
  const end = inRange ? dia! : evento.fecha_fin ?? evento.fecha_inicio;
  const sameDay = start.slice(0, 10) === end.slice(0, 10);
  const timed = sameDay && start.slice(11, 16) !== "00:00";

  let when: string[];
  if (timed) {
    // Sin hora de fin real (23:59 o igual que el inicio): 1 hora y media
    const realEnd = end.slice(11, 16) !== "23:59" && end > start;
    when = [`DTSTART;TZID=Europe/Madrid:${icsDate(start)}`, `DTEND;TZID=Europe/Madrid:${icsDate(realEnd ? end : localIso(start, 90))}`];
  } else {
    // Varios días: evento de día completo (DTEND es el día siguiente al último)
    const last = new Date(`${end.slice(0, 10)}T12:00:00Z`);
    last.setUTCDate(last.getUTCDate() + 1);
    when = [`DTSTART;VALUE=DATE:${icsDay(start)}`, `DTEND;VALUE=DATE:${icsDay(last.toISOString())}`];
  }

  const url = new URL(`/evento/${encodeURIComponent(evento.id)}`, request.url).toString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MiMad//Planes//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${evento.id.replace(/[^\w.-]/g, "-")}@mimad.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    ...when,
    `SUMMARY:${icsText(evento.titulo)}`,
    `LOCATION:${icsText([evento.lugar, evento.direccion].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${icsText(`Plan de MiMad: ${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mimad-plan.ics"`,
    },
  });
}

// Suma minutos a una hora local "2026-10-23T17:00:00" sin cambiar de zona horaria
function localIso(s: string, minutes: number): string {
  const [d, t] = s.replace(" ", "T").split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const x = new Date(Date.UTC(y, m - 1, day, hh, mm + minutes));
  return x.toISOString().slice(0, 19);
}
