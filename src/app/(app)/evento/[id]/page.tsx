import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Accessibility, Bell, Bus, Megaphone, CalendarDays, CalendarPlus, ChevronRight, ExternalLink, Footprints, Languages, MapPin, Ticket, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { accessibilityLabels, distanceKm, getEvent, getSources, isAccessible, type Evento } from "@/lib/data";
import { categoryInfo } from "@/lib/categories";
import { formatDayLong, formatDistance, formatDuration, formatLongDate, formatWhen, niceText, walkingMinutes } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin, type OriginKind } from "@/lib/origin";
import SourceTag from "@/components/SourceTag";
import ShareButton from "@/components/ShareButton";
import BackButton from "@/components/BackButton";
import RecommendSlot from "@/components/RecommendSlot";
import RouteMapLazy from "@/components/simple/RouteMapLazy";
import JoinButton from "./JoinButton";
import EventImage, { photoCredit } from "@/components/EventImage";
import { TRANSLATE_LANGUAGES } from "@/lib/languages";
import { getLang } from "@/lib/i18n/server";
import { makeT, type Lang, type T } from "@/lib/i18n";
import { isLanguagePlan, isNewcomerPlan } from "@/lib/newcomers";
import TranslatePlan from "./TranslatePlan";
import { timeAgo } from "@/lib/companion";

const LANGUAGES: Record<string, string> = {
  es: "español", en: "inglés", fr: "francés", ar: "árabe", zh: "chino", ro: "rumano", pt: "portugués",
};

const AUDIENCE: Record<string, string> = {
  Mayores: "mayores", Niños: "niños", Familias: "familias", Jovenes: "jóvenes", Mujeres: "mujeres",
  PoblaciónGeneral: "todo el mundo", Consumidores: "consumidores", Asociacionismo: "asociaciones",
  "Personas migrantes": "personas migrantes", ConductoresyVehiculos: "conductores", PropietariosdeAnimales: "personas con mascotas",
};

const FROM_LABEL: Record<OriginKind, string> = {
  aqui: "de donde estás", cp: "de tu código postal", casa: "de tu casa", centro: "del centro de Madrid",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const evento = await getEvent(supabase, decodeURIComponent(id));
  return { title: evento ? `${evento.titulo} · MiMad` : "Plan · MiMad" };
}

// Detalle de un evento, versión por defecto (diseño evento.png)
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const supabase = await createClient();

  const [evento, perfil, fuentes, inscritos] = await Promise.all([
    getEvent(supabase, id),
    getCurrentProfile(supabase),
    getSources(),
    supabase.rpc("contar_inscritos", { p_evento: id }),
  ]);
  if (!evento) notFound();

  const origin = await getOrigin(perfil, { allowZone: true });
  const { data: mine } = perfil
    ? await supabase.from("mm_inscripciones").select("id").eq("usuario", perfil.id).eq("evento_id", id).maybeSingle()
    : { data: null };
  const joined = !!mine;

  // Planes de entidades: mensajes de la organización (solo los ven las personas apuntadas)
  const entityEventId = evento.fuente === "entidad" ? evento.id.replace(/^entidad:/, "") : null;
  const { data: mensajes } = entityEventId && joined
    ? await supabase.from("mm_mensajes_evento").select("id, texto, created_at").eq("evento_id", entityEventId).order("created_at", { ascending: false })
    : { data: [] };

  const lang = await getLang();
  const t = makeT(lang);
  const { label } = categoryInfo(evento.categoria);
  const hasPlace = evento.lat != null && evento.lon != null;
  const km = hasPlace ? distanceKm(origin, { lat: evento.lat!, lon: evento.lon! }) : null;
  const dateRow = describeDate(evento, lang);
  const count = typeof inscritos.data === "number" ? inscritos.data : null;
  const audience = (evento.publico ?? "").split(",").map((p) => AUDIENCE[p.trim()] ?? p.trim().toLowerCase()).filter(Boolean);
  const extras = accessibilityLabels(evento).filter((l) => !/^Instalación|Sin información/.test(l));
  const fuente = fuentes[evento.fuente];
  const showFrom = origin.kind !== "centro";

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-[500] flex items-center gap-1 border-b border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <BackButton />
        <h1 className="flex-1 text-xl font-bold">{t("La actividad")}</h1>
        <ShareButton title={evento.titulo} />
        <Link href="/notificaciones" aria-label={t("Notificaciones")} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Bell size={22} aria-hidden="true" />
        </Link>
      </header>

      <div className="flex flex-col gap-6 px-5 pb-6 pt-4">
        {/* Los datos abiertos no traen imagen: fondo de marca con el icono de la categoría */}
        <EventImage src={evento.imagen} categoria={evento.categoria} title={evento.titulo} className="h-56 rounded-3xl" iconSize={80} credit={photoCredit(evento.fuente)} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-coral/10 px-3 py-1 text-sm font-semibold text-coral-texto">{t(label)}</span>
            <span className="text-lg font-bold">{evento.gratuito ? t("Gratis") : evento.precio ?? ""}</span>
          </div>
          <h2 lang="es" className="text-3xl font-bold leading-tight text-balance">{evento.titulo}</h2>
          {evento.organizacion && evento.fuente !== "cepi_actividades" ? (
            <p className="flex flex-wrap items-center gap-x-1.5 text-base text-gris">
              Organiza <span className="font-semibold text-tinta">{niceText(evento.organizacion.replace(" · Entidad verificada", ""))}</span>
              {evento.organizacion.endsWith("· Entidad verificada") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-sm font-semibold text-green-800 ring-1 ring-green-200">✓ {t("Entidad verificada")}</span>
              )}
            </p>
          ) : (
            evento.lugar && (
              <p className="text-base text-gris">
                En <span className="font-semibold text-tinta">{niceText(evento.lugar)}</span>
              </p>
            )
          )}
        </div>

        <ul className="flex flex-col gap-4">
          <InfoRow icon={<CalendarDays size={22} />} title={dateRow.title} detail={dateRow.detail} />
          <InfoRow
            icon={<MapPin size={22} />}
            title={niceText(evento.direccion) ?? niceText(evento.lugar) ?? t("Consultar el lugar")}
            detail={[evento.municipio, km != null && showFrom ? t("A {distancia} {desde}", { distancia: formatDistance(km), desde: origin.zone ? t("de {zona}", { zona: origin.zone }) : t(FROM_LABEL[origin.kind]) }) : null].filter(Boolean).join(" · ") || null}
          />
          {count != null && (
            <InfoRow
              icon={<Users size={22} />}
              title={count === 0 ? t("Sé la primera persona de MiMad en apuntarte") : count === 1 ? t("1 persona de MiMad se ha apuntado") : t("{n} personas de MiMad se han apuntado", { n: count })}
              detail={joined ? t("Tú también vas") : null}
            />
          )}
          {!evento.gratuito && evento.precio && <InfoRow icon={<Ticket size={22} />} title={evento.precio} detail={t("Precio")} />}
          {isAccessible(evento) && (
            <InfoRow icon={<Accessibility size={22} />} title={t("Espacio accesible")} detail={extras.length ? extras.join(" · ") : t("Instalación accesible para movilidad reducida")} tone="green" />
          )}
          {!isAccessible(evento) && extras.length > 0 && <InfoRow icon={<Accessibility size={22} />} title={t("Accesibilidad")} detail={extras.join(" · ")} />}
          {audience.length > 0 && <InfoRow icon={<Users size={22} />} title={t("Para {publico}", { publico: audience.map((a) => t(a)).join(", ") })} detail={t("Público")} />}
          <InfoRow icon={<Languages size={22} />} title={t("Actividad en {idioma}", { idioma: t(LANGUAGES[evento.idioma ?? "es"] ?? "español") })} />
        </ul>

        <section className="flex flex-col gap-2" aria-labelledby="sobre">
          <h2 id="sobre" className="text-2xl font-bold">{t("Sobre el plan")}</h2>
          <div lang={evento.descripcion ? "es" : undefined}>
            <Description evento={evento} label={label} t={t} />
          </div>
          {/* Para personas extranjeras: los datos abiertos solo vienen en español */}
          <TranslatePlan eventoId={evento.id} languages={TRANSLATE_LANGUAGES} loggedIn={!!perfil} lang={lang}
            auto={lang !== "es" && (isNewcomerPlan(evento) || isLanguagePlan(evento))} />
          {evento.url && (
            <a href={evento.url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1.5 text-base font-medium text-coral-texto underline">
              {t("Ver la web oficial")} <ExternalLink size={16} aria-hidden="true" />
              <span className="sr-only">{t("(se abre en otra pestaña)")}</span>
            </a>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <JoinButton eventoId={evento.id} joined={joined} loggedIn={!!perfil} lang={lang} />
          <RecommendSlot eventId={evento.id} />
          {evento.fecha_inicio && evento.fuente !== "cepi_actividades" && (
            <a href={`/evento/${encodeURIComponent(evento.id)}/calendario`} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-base font-medium">
              <CalendarPlus size={20} className="text-coral-texto" aria-hidden="true" /> {t("Añadir al calendario del móvil")}
            </a>
          )}
        </div>

        {(mensajes ?? []).length > 0 && (
          <section aria-labelledby="mensajes-org" className="flex flex-col gap-3 rounded-3xl bg-crema p-5">
            <h2 id="mensajes-org" className="flex items-center gap-2 text-xl font-bold">
              <Megaphone size={22} className="text-coral-texto" aria-hidden="true" /> {t("Mensajes de la organización")}
            </h2>
            <ul className="flex flex-col gap-3">
              {(mensajes ?? []).map((m) => (
                <li key={m.id} className="rounded-2xl bg-white p-4 text-base">
                  <p className="whitespace-pre-line">{m.texto}</p>
                  <p className="mt-1 text-sm text-gris">{timeAgo(m.created_at)}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gris">{t("Solo la entidad que organiza el plan puede escribir aquí.")}</p>
          </section>
        )}

        {hasPlace && (
          <section className="flex flex-col gap-3" aria-labelledby="llegar">
            <h2 id="llegar" className="text-2xl font-bold">{t("Cómo llegar")}</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <RouteMapLazy
                home={showFrom ? { lat: origin.lat, lon: origin.lon } : null}
                place={{ lat: evento.lat!, lon: evento.lon! }}
                homeLabel={origin.kind === "aqui" ? t("Estás aquí") : origin.kind === "cp" ? `CP ${origin.cp}` : t("Tu ubicación")}
              />
              <p className="px-4 py-3 text-base">
                <span className="font-semibold">{niceText(evento.lugar) ?? niceText(evento.direccion)}</span>
                {evento.municipio && <span className="text-gris"> · {evento.municipio}</span>}
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
              <RouteLink
                href={directionsUrl(evento, showFrom ? origin : null, "walking")}
                icon={<Footprints size={22} />}
                title={t("Andando")}
                detail={km != null && showFrom ? t("Unos {n} minutos · ruta en Google Maps", { n: walkingMinutes(km) }) : t("Ruta a pie en Google Maps")}
              />
              <RouteLink
                href={directionsUrl(evento, showFrom ? origin : null, "transit")}
                icon={<Bus size={22} />}
                title={t("En metro o autobús")}
                detail={t("Líneas y horarios en Google Maps")}
              />
            </ul>
            {!showFrom && (
              <p className="text-sm text-gris">
                {perfil ? t("Las distancias se cuentan desde el centro de Madrid. Añade tu código postal en tu perfil para verlas desde tu casa.") : t("Las distancias se cuentan desde el centro de Madrid. Crea una cuenta para verlas desde tu casa.")}
              </p>
            )}
          </section>
        )}

        <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4">
          <SourceTag fuente={fuente} label={fuente ? undefined : evento.fuente} />
          {fuente?.ultima_carga && (
            <p className="pl-5 text-sm text-gris">
              {t("Datos actualizados el {fecha}", { fecha: new Date(fuente.ultima_carga).toLocaleDateString(lang === "es" ? "es-ES" : lang, { day: "numeric", month: "long", timeZone: "Europe/Madrid" }) })}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

// Fila "cuándo" en otro idioma: fechas con Intl (formatDayLong) y palabras del diccionario
function describeDateIn(e: Evento, lang: Lang): { title: string; detail: string | null } {
  const t = makeT(lang);
  if (e.fuente === "cepi_actividades") return { title: formatWhen(e, undefined, lang).day, detail: t("Pregunta el día y la hora en el centro") };
  if (!e.fecha_inicio) return { title: e.horario ?? t("Consultar horario"), detail: e.recurrente ? t("Se repite cada semana") : null };
  const day = (s: string) => formatDayLong(s.slice(0, 10), lang);
  const time = e.fecha_inicio.slice(11, 16);
  if (e.fecha_fin && e.fecha_fin.slice(0, 10) !== e.fecha_inicio.slice(0, 10)) {
    return formatWhen(e).day.startsWith("Hasta")
      ? { title: t("Hasta el {fecha}", { fecha: day(e.fecha_fin) }), detail: t("Ya ha empezado: consulta los días y horarios en la web oficial") }
      : { title: t("Del {inicio} al {fin}", { inicio: day(e.fecha_inicio), fin: day(e.fecha_fin) }), detail: null };
  }
  const duration = formatDuration(e);
  return { title: time && time !== "00:00" ? `${day(e.fecha_inicio)}, ${time}` : day(e.fecha_inicio), detail: duration ? t("Duración: {d}", { d: duration }) : null };
}

// Fila "cuándo": cada fuente da la fecha de una forma distinta
function describeDate(e: Evento, lang: Lang): { title: string; detail: string | null } {
  if (lang !== "es") return describeDateIn(e, lang);
  // CEPI: solo se sabe el mes
  if (e.fuente === "cepi_actividades") return { title: formatWhen(e).day, detail: "Pregunta el día y la hora en el centro" };
  // Talleres semanales sin fecha: "Cada jueves, 16:00 - 17:30"
  if (!e.fecha_inicio) return { title: e.horario ?? "Consultar horario", detail: e.recurrente ? "Se repite cada semana" : null };

  const start = formatLongDate(e) ?? formatWhen(e).day;
  const multiDay = !!e.fecha_fin && e.fecha_fin.slice(0, 10) !== e.fecha_inicio.slice(0, 10);
  if (multiDay) {
    const day = (s: string) => (formatLongDate({ ...e, fecha_inicio: s.slice(0, 10) }) ?? "").toLowerCase(); // "jueves 30 de octubre"
    const started = formatWhen(e).day.startsWith("Hasta");
    return started
      ? { title: `Hasta el ${day(e.fecha_fin!)}`, detail: "Ya ha empezado: consulta los días y horarios en la web oficial" }
      : { title: `Del ${day(e.fecha_inicio)} al ${day(e.fecha_fin!)}`, detail: null };
  }
  const duration = formatDuration(e);
  return { title: start, detail: duration ? `Duración: ${duration}` : null };
}

function InfoRow({ icon, title, detail, tone }: { icon: ReactNode; title: string; detail?: string | null; tone?: "green" }) {
  return (
    <li className="flex items-center gap-4">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone === "green" ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-white"}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-lg leading-snug ${tone === "green" ? "text-green-800" : ""}`}>{title}</p>
        {detail && <p className="text-sm text-gris">{detail}</p>}
      </div>
    </li>
  );
}

function RouteLink({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-white p-4 hover:bg-slate-50">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100" aria-hidden="true">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{title}</span>
          <span className="block text-sm text-gris">{detail}</span>
        </span>
        <ChevronRight size={22} className="text-gris" aria-hidden="true" />
        <span className="sr-only">(se abre en otra pestaña)</span>
      </a>
    </li>
  );
}

// Descripción del dataset: cortada si es larga, con "Leer más"
function Description({ evento, label, t }: { evento: Evento; label: string; t: T }) {
  const text = evento.descripcion?.trim();
  if (!text) {
    return <p className="text-lg leading-relaxed text-gris">{t("Actividad de {tipo}. Los datos abiertos no traen más detalles: consulta la web oficial.", { tipo: t(label).toLowerCase() })}</p>;
  }
  if (text.length <= 320) return <p className="text-lg leading-relaxed text-gris">{text}</p>;
  const cut = text.lastIndexOf(". ", 320) > 150 ? text.lastIndexOf(". ", 320) + 1 : text.lastIndexOf(" ", 320);
  return (
    <details className="group text-lg leading-relaxed text-gris">
      <summary className="cursor-pointer list-none">
        <span className="group-open:hidden">
          {text.slice(0, cut)}… <span className="font-medium text-coral-texto underline">{t("Leer más")}</span>
        </span>
        <span className="hidden font-medium text-coral-texto underline group-open:inline">{t("Leer menos")}</span>
      </summary>
      <p>{text}</p>
    </details>
  );
}

type P = { lat: number; lon: number };

// Ruta en Google Maps (en el móvil abre la app si está instalada). Si no sabemos desde
// dónde sale la persona, Google Maps usa la ubicación actual del teléfono.
function directionsUrl(e: Evento, from: P | null, mode: "walking" | "transit"): string {
  const params = new URLSearchParams({ api: "1", destination: `${e.lat},${e.lon}`, travelmode: mode });
  if (from) params.set("origin", `${from.lat},${from.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
