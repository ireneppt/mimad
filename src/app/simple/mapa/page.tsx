import Link from "next/link";
import type { ReactNode } from "react";
import { Accessibility, ArrowLeft, ArrowRight, CalendarDays, HeartHandshake, Sun } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import LocationPanel from "@/components/simple/LocationPanel";
import SimpleMapView from "@/components/simple/SimpleMapView";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getOrigin, type OriginKind } from "@/lib/origin";
import { fromWhere } from "@/lib/simplePlans";
import { getMapItems, parseQueVer, QUE_VER } from "@/lib/simpleMap";

export const metadata = { title: "Mapa · MiMad simplificada" };

const HOME_LABEL: Record<OriginKind, string> = { casa: "Tu casa", aqui: "Estás aquí", cp: "Tu código postal", centro: "Puerta del Sol" };

// Mapa sencillo para personas mayores o con necesidades especiales. Dos pasos:
//   1) ¿Qué quieres ver? (planes de hoy, de mañana, o sitios para mayores)
//   2) Mapa con como mucho 10 puntos numerados + la misma información en una lista
// ?ver=hoy|manana|sitios &acc=1 (solo accesibles en silla de ruedas)
export default async function SimpleMapPage({ searchParams }: { searchParams: Promise<{ ver?: string; acc?: string }> }) {
  const params = await searchParams;
  const ver = parseQueVer(params.ver);
  const soloAccesible = params.acc === "1";

  if (!ver) {
    return (
      <SimpleShell
        defaultHref="/mapa"
        step={1}
        total={2}
        title="¿Qué quieres ver en el mapa?"
        intro={<p>Toca una opción. Después verás un mapa y una lista con lo que hay cerca de tu casa.</p>}
        help={
          <ol>
            <li>Toca lo que quieres ver: <strong>Planes de hoy</strong>, <strong>Planes de mañana</strong> o <strong>Sitios para mayores</strong>.</li>
            <li>Los sitios son centros de mayores, hogares y centros de día, también para personas con discapacidad.</li>
            <li>Para volver al inicio, toca la flecha <strong>Volver al inicio</strong>.</li>
          </ol>
        }
      >
        <Option href="/simple/mapa?ver=hoy" icon={<Sun size={44} />} titulo={QUE_VER.hoy.boton} detalle={QUE_VER.hoy.detalle} />
        <Option href="/simple/mapa?ver=manana" icon={<CalendarDays size={44} />} titulo={QUE_VER.manana.boton} detalle={QUE_VER.manana.detalle} />
        <Option href="/simple/mapa?ver=sitios" icon={<HeartHandshake size={44} />} titulo={QUE_VER.sitios.boton} detalle={QUE_VER.sitios.detalle} />
        <Link href="/simple" className="flex h-16 items-center justify-center gap-2 rounded-2xl text-xl font-semibold underline-offset-4 hover:underline">
          <ArrowLeft size={26} aria-hidden="true" /> Volver al inicio
        </Link>
      </SimpleShell>
    );
  }

  const supabase = await createClient();
  const perfil = await getCurrentProfile(supabase);
  const origin = await getOrigin(perfil);
  const items = await getMapItems(supabase, { home: origin, ver, soloAccesible, intereses: perfil?.intereses ?? [] });
  const esPlan = ver !== "sitios";
  const desde = origin.kind === "centro" ? " de la Puerta del Sol" : fromWhere(origin.kind);
  const lugarCasa = origin.kind === "casa" ? "tu casa" : origin.kind === "aqui" ? "donde estás" : origin.kind === "cp" ? "tu código postal" : "la Puerta del Sol";

  return (
    <SimpleShell
      defaultHref="/mapa"
      step={2}
      total={2}
      title={QUE_VER[ver].titulo + (soloAccesible ? " accesibles" : "")}
      intro={
        items.length > 0 ? (
          <>
            <p>
              Hay <strong>{items.length} {esPlan ? (items.length === 1 ? "plan" : "planes") : items.length === 1 ? "sitio" : "sitios"}</strong> cerca de {lugarCasa}.
            </p>
            <p>
              La etiqueta <strong>verde</strong> es {lugarCasa}. Cada <strong>círculo con un número</strong> es un {esPlan ? "plan" : "sitio"}. El 1 es el que está más cerca.
            </p>
          </>
        ) : (
          <p>
            No hay {esPlan ? "planes" : "sitios"}
            {soloAccesible ? " accesibles en silla de ruedas" : ""} cerca de {lugarCasa}
            {ver === "hoy" ? " para hoy" : ver === "manana" ? " para mañana" : ""}.
          </p>
        )
      }
      help={
        <ol>
          <li>En el mapa, la etiqueta verde es {lugarCasa}. Cada círculo con un número es un {esPlan ? "plan" : "sitio"}.</li>
          <li>Toca un número para ver qué es. Lo verás justo debajo del mapa.</li>
          <li>Para ver el mapa más grande o más pequeño, toca <strong>Acercar</strong> o <strong>Alejar</strong>. Para volver a ver todos, toca <strong>Ver todos</strong>.</li>
          <li>Debajo está la misma información en una lista, del más cerca al más lejos.</li>
          {esPlan ? <li>Para apuntarte, toca <strong>Ver el plan</strong>.</li> : <li>Para preguntar, toca <strong>Llamar</strong>.</li>}
          <li>Si vas en silla de ruedas, toca <strong>Solo accesibles en silla de ruedas</strong>.</li>
          <li>Para ver otra cosa, toca <strong>Ver otra cosa en el mapa</strong>.</li>
        </ol>
      }
    >
      <LocationPanel
        kind={origin.kind}
        cp={origin.cp}
        here={origin.kind === "aqui" ? { lat: origin.lat, lon: origin.lon } : null}
        loggedIn={!!perfil}
        hasHome={perfil?.lat != null && perfil?.lon != null}
      />

      {/* Interruptor: solo los que se puede entrar en silla de ruedas */}
      <form action="/simple/mapa" className="contents">
        <input type="hidden" name="ver" value={ver} />
        {!soloAccesible && <input type="hidden" name="acc" value="1" />}
        <button
          type="submit"
          aria-pressed={soloAccesible}
          className={`flex min-h-20 items-center gap-4 rounded-3xl border-2 p-4 text-left ${soloAccesible ? "border-green-700 bg-green-50" : "border-slate-400 bg-white"}`}
        >
          <Accessibility size={40} className={`shrink-0 ${soloAccesible ? "text-green-800" : "text-blue-700"}`} aria-hidden="true" />
          <span className="flex-1 text-xl font-bold leading-snug">
            Solo accesibles en silla de ruedas
            <span className="block text-lg font-normal text-gris">{soloAccesible ? "Activado. Toca para ver todos." : "Toca para ver solo esos."}</span>
          </span>
          <span className={`relative h-10 w-[4.5rem] shrink-0 rounded-full ${soloAccesible ? "bg-green-700" : "bg-slate-400"}`} aria-hidden="true">
            <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all ${soloAccesible ? "left-9" : "left-1"}`} />
          </span>
        </button>
      </form>

      {items.length > 0 ? (
        <SimpleMapView
          items={items}
          kind={esPlan ? "plan" : "sitio"}
          home={{ lat: origin.lat, lon: origin.lon, label: HOME_LABEL[origin.kind] }}
          desde={desde}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {soloAccesible && (
            <Link href={`/simple/mapa?ver=${ver}`} className="bg-degradado-fuerte flex h-16 items-center justify-center rounded-2xl text-2xl font-bold text-white">
              Ver también los no accesibles
            </Link>
          )}
          {ver === "hoy" && (
            <Link href={`/simple/mapa?ver=manana${soloAccesible ? "&acc=1" : ""}`} className="flex h-16 items-center justify-center rounded-2xl border-2 border-slate-400 text-2xl font-bold">
              Ver los de mañana
            </Link>
          )}
        </div>
      )}

      <Link href="/simple/mapa" className="flex h-16 items-center justify-center gap-2 rounded-2xl border-2 border-slate-400 bg-slate-100 text-xl font-bold">
        <ArrowLeft size={26} aria-hidden="true" /> Ver otra cosa en el mapa
      </Link>
    </SimpleShell>
  );
}

function Option({ href, icon, titulo, detalle }: { href: string; icon: ReactNode; titulo: string; detalle: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-3xl border-2 border-slate-400 bg-white p-5">
      <span className="shrink-0 text-coral-texto" aria-hidden="true">{icon}</span>
      <span className="flex-1">
        <span className="block text-2xl font-bold leading-tight">{titulo}</span>
        <span className="block text-xl leading-snug text-gris">{detalle}</span>
      </span>
      <ArrowRight size={32} className="shrink-0" aria-hidden="true" />
    </Link>
  );
}

