// Mapa de la versión simplificada: como mucho 10 planes o sitios cerca de casa, numerados
// por cercanía y explicados con palabras (qué es, cuándo, dónde, qué ayudas tiene).
import type { SupabaseClient } from "@supabase/supabase-js";
import { distanceKm, getPlaces, getSources, isAccessible, type Evento, type Lugar } from "./data";
import { walkingMinutes } from "./format";
import { getSimplePlans, whenInWords } from "./simplePlans";

export type QueVer = "hoy" | "manana" | "sitios";

export const QUE_VER: Record<QueVer, { titulo: string; boton: string; detalle: string }> = {
  hoy: { titulo: "Planes de hoy", boton: "Planes de hoy", detalle: "Actividades que hay hoy cerca de tu casa" },
  manana: { titulo: "Planes de mañana", boton: "Planes de mañana", detalle: "Actividades que hay mañana cerca de tu casa" },
  sitios: {
    titulo: "Sitios para mayores",
    boton: "Sitios para mayores y personas con discapacidad",
    detalle: "Centros de mayores, hogares y centros de día",
  },
};

export const parseQueVer = (s?: string): QueVer | null => (s === "hoy" || s === "manana" || s === "sitios" ? s : null);

export type MapItem = {
  n: number; // número en el mapa y en la lista
  id: string;
  kind: "plan" | "sitio";
  titulo: string;
  tipo: string | null; // "Centro de día", "Concierto"...
  cuando: string | null; // planes: "Hoy, a las 6 de la tarde"; sitios: horario
  donde: string | null;
  minutos: number | null; // andando desde casa
  gratis: boolean | null;
  ayudas: string[]; // "Se puede entrar en silla de ruedas"...
  noAccesible: boolean; // los datos dicen que no se puede entrar en silla de ruedas
  sinDatos: boolean; // los datos no dicen nada de accesibilidad
  para: string | null; // "Para personas con discapacidad intelectual"
  telefono: string | null;
  lat: number;
  lon: number;
  href: string | null; // detalle del plan (los sitios no tienen)
  fuente: { nombre: string; organismo: string; url: string } | null;
};

export const MAX_EN_MAPA = 10;

// Sitios que se enseñan (nunca centros de acogida ni residencias: ya los excluye v_lugares)
const CATEGORIAS_SITIOS = ["Centro municipal de mayores", "Hogar de mayores", "Centro de día", "Talleres"];

// Códigos de accesibilidad de los datos abiertos, dichos de forma sencilla
const AYUDAS: Record<string, string> = {
  "1": "Se puede entrar en silla de ruedas",
  "2": "Se puede entrar en parte en silla de ruedas",
  "4": "Hay intérprete de lengua de signos",
  "5": "Tiene suelo con guías para personas ciegas",
  "6": "Tiene bucle magnético para audífonos",
};

function accesibilidad(codes: string | null) {
  const list = (codes ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  return {
    ayudas: list.map((c) => AYUDAS[c]).filter(Boolean),
    noAccesible: list.includes("0"),
    sinDatos: list.length === 0 || list.every((c) => c === "3"),
  };
}

const fixCase = (s: string | null) => {
  if (!s || s !== s.toUpperCase()) return s;
  const small = new Set(["de", "del", "la", "las", "el", "los", "y"]);
  return s.toLowerCase().split(" ").map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
};

function paraQuien(publico: string | null): string | null {
  if (!publico) return null;
  if (/^mayores$/i.test(publico.trim())) return "Pensado para personas mayores";
  return `Para ${publico.charAt(0).toLowerCase()}${publico.slice(1)}`;
}

type Home = { lat: number; lon: number };

const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// "91 942 2870 / 602483813" → "919422870": el primer teléfono español de 9 cifras (o nada)
function firstPhone(tel: string | null): string | null {
  const m = (tel ?? "").replace(/(\d)[\s.-](?=\d)/g, "$1").match(/(?:\+34)?([6789]\d{8})(?!\d)/);
  return m ? m[1] : null;
}

export async function getMapItems(
  db: SupabaseClient,
  opts: { home: Home; ver: QueVer; soloAccesible: boolean; intereses: string[] }
): Promise<MapItem[]> {
  const { home, ver, soloAccesible } = opts;
  const fuentes = await getSources();
  const fuente = (id: string) => {
    const f = fuentes[id];
    return f ? { nombre: f.nombre, organismo: f.organismo, url: f.url_ficha } : null;
  };
  const minutos = (p: { lat: number | null; lon: number | null }) =>
    p.lat != null && p.lon != null ? walkingMinutes(distanceKm(home, { lat: p.lat, lon: p.lon })) : null;

  if (ver === "sitios") {
    const lugares = await getPlaces(db, CATEGORIAS_SITIOS, { near: { ...home, km: 3 } });
    // El mismo centro puede venir de dos fuentes (Comunidad y Ayuntamiento): se queda el que trae más datos
    const seen = new Set<string>();
    const unicos = [...lugares]
      .sort((a, b) => Number(b.fuente === "centros_mayores") - Number(a.fuente === "centros_mayores"))
      .filter((l) => {
        const key = plain(l.nombre).replace(/\b(centro|municipal|de|del|mayores|cmm)\b/g, "").replace(/[^a-z0-9]/g, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return unicos
      .filter((l) => !soloAccesible || isAccessible(l))
      .map((l) => ({ l, m: minutos(l) ?? 999 }))
      .sort((a, b) => a.m - b.m)
      .slice(0, MAX_EN_MAPA)
      .map(({ l, m }, i): MapItem => fromPlace(l, i + 1, m, fuente(l.fuente)));
  }

  const plans = await getSimplePlans(db, {
    home,
    when: ver,
    intereses: opts.intereses,
    recomendaciones: [], // las recomendaciones de la familia pueden ser de otro día: en el mapa, solo ese día
    filter: soloAccesible ? (e) => isAccessible(e) : undefined,
    max: 30,
  });
  return plans
    .filter((p) => p.evento.lat != null && p.evento.lon != null)
    .slice(0, MAX_EN_MAPA)
    .sort((a, b) => (a.km ?? 99) - (b.km ?? 99))
    .map((p, i): MapItem => fromEvent(p.evento, i + 1, p.km != null ? walkingMinutes(p.km) : null, fuente(p.evento.fuente)));
}

function fromEvent(e: Evento, n: number, minutos: number | null, fuente: MapItem["fuente"]): MapItem {
  return {
    n,
    id: e.id,
    kind: "plan",
    titulo: e.titulo,
    tipo: null,
    cuando: whenInWords(e),
    donde: fixCase(e.lugar ?? e.direccion),
    minutos,
    gratis: e.gratuito,
    ...accesibilidad(e.accesibilidad),
    para: paraQuien(e.publico),
    telefono: null,
    lat: e.lat!,
    lon: e.lon!,
    href: `/simple/evento/${encodeURIComponent(e.id)}`,
    fuente,
  };
}

function fromPlace(l: Lugar, n: number, minutos: number, fuente: MapItem["fuente"]): MapItem {
  return {
    n,
    id: l.id,
    kind: "sitio",
    titulo: fixCase(l.nombre) ?? l.nombre,
    tipo: plain(l.nombre).includes(plain(l.categoria)) ? null : l.categoria, // sin repetir "Centro municipal de mayores"
    cuando: l.horario,
    donde: fixCase(l.direccion),
    minutos: minutos === 999 ? null : minutos,
    gratis: null,
    ...accesibilidad(l.accesibilidad),
    para: paraQuien(l.publico),
    telefono: firstPhone(l.telefono),
    lat: l.lat,
    lon: l.lon,
    href: null,
    fuente,
  };
}
