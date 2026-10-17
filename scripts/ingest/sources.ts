// Una entrada por fuente de datos abiertos: cómo se descarga y cómo se
// transforma cada fila al formato de su tabla da_*.
import { XMLParser } from "fast-xml-parser";
import { clean, decodeEntities, fetchArcgisAll, fetchJson, fetchText, hashId, htmlToText, titleKey, toNumber, utmToLatLon } from "./lib";

export type Source = {
  id: string; // = da_fuentes.id
  url: string; // URL de descarga (la misma que en da_fuentes)
  table: string;
  key: string; // clave primaria de la tabla
  scope?: { column: string; value: string }; // si la tabla tiene varias fuentes (p. ej. idiomas)
  load: (url: string) => Promise<Record<string, unknown>[]>;
};

// ---------------------------------------------------------------------
// Formato JSON-LD (@graph) de datos.madrid.es, común a agendas y lugares
// ---------------------------------------------------------------------
type GraphItem = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// "https://.../Distrito/FuencarralElPardo/Barrio/Valverde" → "Fuencarral El Pardo"
function lastSegment(id: unknown, after: string): string | null {
  const m = String(id ?? "").match(new RegExp(`/${after}/([^/]+)`));
  return m ? m[1].replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2") : null;
}

function graphAddress(item: GraphItem) {
  const addr = item.address ?? {};
  // En la agenda los datos van dentro de address.area; en los lugares, en address
  const area = addr.area ?? {};
  return {
    direccion: clean(area["street-address"] ?? addr["street-address"]),
    codigo_postal: clean(area["postal-code"] ?? addr["postal-code"]),
    localidad: clean(area.locality ?? addr.locality),
    distrito: lastSegment(addr.district?.["@id"], "Distrito"),
    barrio: lastSegment(area["@id"], "Barrio"),
    lat: toNumber(item.location?.latitude),
    lon: toNumber(item.location?.longitude),
  };
}

async function loadGraph(url: string): Promise<GraphItem[]> {
  const json = await fetchJson<{ "@graph"?: GraphItem[] }>(url);
  if (!Array.isArray(json["@graph"])) throw new Error("No se encuentra @graph en la respuesta");
  return json["@graph"];
}

// ---------------------------------------------------------------------
// CEPI: deducir el idioma a partir del texto (no viene en el dataset)
// ---------------------------------------------------------------------
function detectLanguage(text: string): string {
  const t = text.toLowerCase();
  if (/ingl[eé]s|english/.test(t)) return "en";
  if (/franc[eé]s|fran[cç]ais/.test(t)) return "fr";
  if (/[aá]rabe/.test(t)) return "ar";
  if (/chino|mandar[ií]n/.test(t)) return "zh";
  if (/rumano/.test(t)) return "ro";
  if (/portugu[eé]s/.test(t)) return "pt";
  return "es";
}

export const SOURCES: Source[] = [
  {
    id: "centros_atencion_social",
    url: "https://datos.comunidad.madrid/catalogo/dataset/b8cdb7f7-3185-4938-800a-fefda72333f5/resource/fb98d116-eb79-4100-8cd4-d5ce2e2c439b/download/atencion_social_registro_centros.json",
    table: "da_centros_atencion_social",
    key: "numero_registro",
    async load(url) {
      const json = await fetchJson<{ data: Record<string, string>[] }>(url);
      return json.data.map((r) => ({
        numero_registro: clean(r.numero_registro),
        sector: clean(r.sector),
        tipo: clean(r.tipo),
        subtipo: clean(r.subtipo),
        denominacion: clean(r.denominacion),
        plazas_autorizadas: toNumber(r.plazas_autorizadas_numero),
        municipio_codigo: clean(r.municipio_codigo),
        municipio_nombre: clean(r.municipio_nombre),
        direccion: clean(
          [r.direccion_via_tipo, r.direccion_via_nombre].filter(Boolean).join(" ") +
            (r.direccion_portal ? `, ${r.direccion_portal}` : "")
        ),
        codigo_postal: clean(r.direccion_codigo_postal),
        area: clean(r.direccion_area),
        distrito: clean(r.direccion_distrito),
        zona: clean(r.direccion_zonass),
        coor_x: clean(r.direccion_coor_x),
        coor_y: clean(r.direccion_coor_y),
        ...utmToLatLon(r.direccion_coor_x, r.direccion_coor_y),
        telefono: clean(r.contacto_telefono),
        correo: clean(r.contacto_correo),
        entidad_denominacion: clean(r.entidad_denominacion),
        entidad_nif: clean(r.entidad_nif),
        entidad_naturaleza: clean(r.entidad_naturaleza),
        tipo_gestion: clean(r.tipo_gestion),
      }));
    },
  },
  {
    id: "cepi_actividades",
    url: "https://datos.comunidad.madrid/dataset/bc5a430c-1819-4478-87fc-09c771e0455f/resource/168d78fb-c202-4d80-9a41-0c8d338d73d1/download/cepi_actividades.json",
    table: "da_cepi_actividades",
    key: "id",
    async load(url) {
      const json = await fetchJson<{ data: Record<string, string>[] }>(url);
      const seen = new Map<string, number>();
      return json.data.map((r) => {
        const [mes, anio] = String(r.mes_ano ?? "").split("_").map(Number);
        // No hay id oficial: hash de la fila (+ contador si se repite exacta)
        const base = hashId(r.codigo, r.centro, r.denominacion, r.tipo_actividad, r.ambito, r.mes_ano);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return {
          id: n === 1 ? base : `${base}-${n}`,
          codigo: clean(r.codigo),
          centro: clean(r.centro),
          tipo_actividad: clean(r.tipo_actividad),
          denominacion: clean(r.denominacion),
          numero_horas: toNumber(r.numero_horas),
          ambito: clean(r.ambito),
          subambito: clean(r.subambito),
          mes: mes || null,
          anio: anio || null,
          idioma: detectLanguage(`${r.denominacion} ${r.subambito}`),
        };
      });
    },
  },
  {
    id: "talleres_envejecimiento",
    url: "https://datos.comunidad.madrid/dataset/a4ae43dd-6f22-4498-b5e8-2ba6308ffa36/resource/b09e9531-e3c8-4bc6-a6f4-a71773af20a0/download/talleres_envejecimiento_activo.json",
    table: "da_talleres_envejecimiento",
    key: "id",
    async load(url) {
      const json = await fetchJson<{ data: Record<string, string | number>[] }>(url);
      return json.data.map((r) => ({
        id: hashId(r.municipio_codigo, r.taller_denominacion, r["Año"]),
        municipio_codigo: clean(r.municipio_codigo),
        municipio_nombre: clean(r.municipio_nombre),
        taller: clean(r.taller_denominacion),
        numero_adjudicados: toNumber(r.taller_adjudicados_numero),
        anio: toNumber(r["Año"]),
      }));
    },
  },
  {
    id: "agenda_madrid",
    url: "https://datos.madrid.es/dataset/300107-0-agenda-actividades-eventos/resource/300107-5-agenda-actividades-eventos-json/download/300107-5-agenda-actividades-eventos-json.json",
    table: "da_agenda_madrid",
    key: "id",
    async load(url) {
      const items = await loadGraph(url);
      return items.map((e) => ({
        id: clean(e.id),
        titulo: clean(e.title) ?? "(sin título)",
        titulo_clave: titleKey(e.title), // para reconocerlo en la Agenda turística (y coger su foto)
        descripcion: clean(e.description),
        categoria: clean(String(e["@type"] ?? "").split("/").pop()),
        fecha_inicio: clean(e.dtstart)?.replace(/\.0$/, "") ?? null,
        fecha_fin: clean(e.dtend)?.replace(/\.0$/, "") ?? null,
        hora: clean(e.time),
        dias_excluidos: clean(e["excluded-days"]),
        recurrencia_dias: clean(e.recurrence?.days),
        recurrencia_frecuencia: clean(e.recurrence?.frequency),
        recurrencia_intervalo: toNumber(e.recurrence?.interval),
        gratuito: e.free === 1 || e.free === "1",
        precio: clean(e.price),
        publico: clean(e.audience),
        url: clean(e.link),
        lugar: clean(e["event-location"]),
        ...graphAddress(e),
        organizacion: clean(e.organization?.["organization-name"]),
        accesibilidad: clean(e.organization?.accesibility),
      }));
    },
  },
  {
    id: "centros_mayores",
    url: "https://datos.madrid.es/dataset/200337-0-centros-mayores/resource/200337-1-centros-mayores-json/download/200337-1-centros-mayores-json.json",
    table: "da_centros_mayores",
    key: "id",
    async load(url) {
      const items = await loadGraph(url);
      return items.map((e) => ({
        id: clean(e.id),
        nombre: clean(e.title) ?? "(sin nombre)",
        descripcion: clean(e.organization?.["organization-desc"]),
        horario: clean(e.organization?.schedule),
        servicios: clean(e.organization?.services),
        ...graphAddress(e),
        url: clean(e.relation),
        accesibilidad: clean(e.organization?.accesibility),
      }));
    },
  },
  {
    id: "juntos_contra_soledad",
    url: "https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/JUNTOS_CONTRA_LA_SOLEDAD/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json",
    table: "da_juntos_contra_soledad",
    key: "id",
    async load(url) {
      const features = await fetchArcgisAll(url);
      return features.map(({ attributes: a, geometry: g }) => ({
        id: clean(a.OBJECTID),
        centro: clean(a.CENTRO),
        direccion: clean(a.DIRECCION),
        distrito: clean(a.DISTRITO),
        barrio: clean(a.BARRIO),
        tipo_taller: clean(a.TIPO_TALLER),
        dia: clean(a.DIA),
        horario: clean(a.HORARIO),
        transporte: clean(a.TRANSPORTE),
        descripcion: clean(a.DESCRIPCION),
        mas_informacion: clean(a.MAS_INFORMACION),
        email: clean(a.EMAIL),
        lat: g?.y ?? null,
        lon: g?.x ?? null,
      }));
    },
  },
  {
    id: "agenda_turismo",
    url: "https://datos.madrid.es/dataset/300028-0-agenda-turismo/resource/300028-2-agenda-turismo/download/300028-2-agenda-turismo.xml",
    table: "da_agenda_turismo",
    key: "id,idioma",
    scope: { column: "idioma", value: "es" },
    load: (url) => loadTourism(url, "es"),
  },
];

// ---------------------------------------------------------------------
// Agenda turística (esmadrid.com): XML, ~1.100 planes con foto. Fila = /serviceList/service
// ---------------------------------------------------------------------
type Xml = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Sus categorías → las de la agenda del Ayuntamiento (iconos y filtro "Para ti")
const TOURISM_CATEGORIES: Record<string, string> = {
  "Música": "Musica",
  Exposiciones: "Exposiciones",
  "Niños": "CuentacuentosTiteresMarionetas",
  "Teatro y danza": "TeatroPerformance",
  "Eventos de ciudad": "Fiestas",
  Deporte: "ActividadesDeportivas",
  Ferias: "Ferias",
};

const cdata = (v: Xml | string | undefined): string | null => (v == null ? null : typeof v === "string" ? v : (v["#cdata"] ?? v["#text"] ?? null));
// "08/11/2026" → "2026-11-08"
const dmy = (s: string | undefined) => {
  const m = String(s ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

async function loadTourism(url: string, idioma: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    cdataPropName: "#cdata",
    isArray: (n) => ["service", "media", "item", "categoria", "subcategoria", "rango"].includes(n),
  });
  const services: Xml[] = parser.parse(await fetchText(url))?.serviceList?.service ?? [];
  if (!services.length) throw new Error("No se encuentran planes en el XML");

  return services.map((sv) => {
    const b = sv.basicData ?? {};
    const g = sv.geoData ?? {};
    const items: Xml[] = sv.extradata?.item ?? [];
    const item = (name: string) => htmlToText(cdata(items.find((i) => i["@name"] === name)));
    const cat = sv.extradata?.categorias?.categoria?.[0]?.item?.find((i: Xml) => i["@name"] === "Categoria")?.["#text"];
    const ranges: Xml[] = sv.extradata?.fechas?.rango ?? [];
    const starts = ranges.map((r) => dmy(r.inicio)).filter(Boolean).sort() as string[];
    const ends = ranges.map((r) => dmy(r.fin)).filter(Boolean).sort() as string[];
    const horario = item("Horario");
    const times = [...(horario ?? "").matchAll(/(\d{1,2})[:.](\d{2})/g)].map((m) => `${m[1].padStart(2, "0")}:${m[2]}`);
    const start = starts[0] ?? null;
    const end = ends[ends.length - 1] ?? start;
    const sameDay = start && start === end;
    const precio = item("Servicios de pago");
    const title = decodeEntities(cdata(b.title) ?? cdata(b.name) ?? "").trim();
    const image = (sv.multimedia?.media ?? []).find((m: Xml) => m["@type"] === "image")?.url;
    return {
      id: String(sv["@id"]),
      idioma,
      titulo: title || "(sin título)",
      titulo_clave: titleKey(title),
      descripcion: htmlToText(cdata(b.body))?.slice(0, 3000) ?? null,
      categoria: TOURISM_CATEGORIES[cat] ?? null,
      categoria_original: clean(cat),
      fecha_inicio: start ? `${start}T${times[0] ?? "00:00"}:00` : null,
      fecha_fin: end ? `${end}T${sameDay && times[1] ? times[1] : "23:59"}:00` : null,
      horario: horario?.slice(0, 300) ?? null,
      gratuito: precio ? /gratu|gratis|libre/i.test(precio) : null,
      precio: precio?.slice(0, 200) ?? null,
      publico: cat === "Niños" ? "Niños,Familias" : null,
      lugar: clean(decodeEntities(cdata(b.nombrert) ?? "")),
      direccion: clean(decodeEntities(cdata(g.address) ?? "")),
      codigo_postal: clean(g.zipcode),
      localidad: clean(g.subAdministrativeArea) ?? "Madrid",
      lat: toNumber(g.latitude),
      lon: toNumber(g.longitude),
      url: clean(cdata(b.web)),
      imagen_url: clean(image),
    };
  });
}
