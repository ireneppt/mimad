"use client";

// Mapa + lista de la versión simplificada. Lo que se ve en el mapa está también, con
// palabras, en la lista (para quien no se aclara con mapas o usa un lector de pantalla).
// Tocar un número del mapa enseña ese plan justo debajo; "Ver en el mapa" hace lo contrario.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Accessibility, CircleAlert, Clock, Database, Euro, Info, MapPin, MapPinned, Phone, Route, UsersRound,
} from "lucide-react";
import { displayPhone, telHref } from "@/lib/phoneLinks";
import type { MapItem } from "@/lib/simpleMap";

const SimpleMap = dynamic(() => import("./SimpleMap"), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-3xl bg-slate-100" aria-hidden="true" />,
});

export default function SimpleMapView({
  items, kind, home, desde,
}: {
  items: MapItem[];
  kind: "plan" | "sitio";
  home: { lat: number; lon: number; label: string } | null;
  desde: string; // " de tu casa", " de donde estás"...
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const pins = useMemo(() => items.map(({ n, lat, lon, titulo }) => ({ n, lat, lon, titulo })), [items]);
  const elegido = items.find((i) => i.n === selected) ?? null;
  const palabra = kind === "plan" ? "plan" : "sitio";

  const choose = (n: number) => {
    const it = items.find((i) => i.n === n);
    setSelected(n);
    setAviso(it ? `Has elegido el número ${n}: ${it.titulo}. Lo tienes debajo del mapa.` : "");
  };

  const showOnMap = (n: number) => {
    choose(n);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">{aviso}</p>

      <div ref={mapRef} className="scroll-mt-4" role="group" aria-label={`Mapa con ${items.length} ${palabra}s numerados. La misma información está en la lista de abajo.`}>
        <SimpleMap pins={pins} kind={kind} home={home} selected={selected} onSelect={choose} />
      </div>

      {elegido ? (
        <section aria-label={`Número ${elegido.n}, el que has tocado`} className="flex flex-col gap-2">
          <p className="text-xl font-bold">Has tocado el número {elegido.n}:</p>
          <ItemCard item={elegido} desde={desde} home={home} highlighted />
        </section>
      ) : (
        <p className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4 text-xl leading-snug">
          <Info size={28} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />
          <span>Toca un número del mapa para ver qué es, o mira la lista de abajo.</span>
        </p>
      )}

      <section aria-labelledby="lista" className="flex flex-col gap-4">
        <h2 id="lista" className="text-2xl font-bold">
          Todos, del más cerca al más lejos
        </h2>
        <ol className="flex flex-col gap-4">
          {items.map((it) => (
            <li key={it.id}>
              <ItemCard item={it} desde={desde} home={home} highlighted={it.n === selected} onShowOnMap={() => showOnMap(it.n)} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function ItemCard({
  item, desde, home, highlighted, onShowOnMap,
}: {
  item: MapItem;
  desde: string;
  home: { lat: number; lon: number } | null;
  highlighted: boolean;
  onShowOnMap?: () => void;
}) {
  const isPlan = item.kind === "plan";
  const color = isPlan ? "bg-[#b4233a]" : "bg-blue-700";
  const tel = telHref(item.telefono);
  const btn = "flex h-16 items-center justify-center gap-2 rounded-2xl text-xl font-bold";

  return (
    <article
      aria-labelledby={`it-${item.n}`}
      className={`flex flex-col gap-3 rounded-3xl border-2 bg-white p-5 ${highlighted ? "border-tinta ring-4 ring-yellow-400" : "border-slate-300"}`}
    >
      <div className="flex items-start gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${color}`} aria-hidden="true">
          {item.n}
        </span>
        <div>
          <h3 id={`it-${item.n}`} className="text-2xl font-bold leading-tight">
            <span className="sr-only">Número {item.n}: </span>
            {item.titulo}
          </h3>
          {item.tipo && <p className="text-xl text-gris">{item.tipo}</p>}
        </div>
      </div>

      {item.cuando && (
        <Row icon={<Clock size={26} />} label={isPlan ? "Cuándo" : "Horario"}>
          {item.cuando}
        </Row>
      )}
      {(item.donde || item.minutos != null) && (
        <Row icon={<MapPin size={26} />} label="Dónde">
          {item.donde}
          {item.minutos != null && <strong className="block">A {item.minutos} minutos andando{desde}</strong>}
        </Row>
      )}
      {item.gratis && (
        <Row icon={<Euro size={26} />} label="Precio">
          Es gratis
        </Row>
      )}
      {item.para && (
        <Row icon={<UsersRound size={26} />} label="Para quién">
          {item.para}
        </Row>
      )}

      {/* Accesibilidad: lo que dicen los datos, o que no lo sabemos */}
      {item.ayudas.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-green-900">
          <Accessibility size={28} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-bold">Ayudas para entrar y participar</p>
            <ul className="text-xl leading-snug">
              {item.ayudas.map((a) => <li key={a}>{a}.</li>)}
            </ul>
          </div>
        </div>
      ) : item.noAccesible ? (
        <p className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-xl leading-snug text-amber-900">
          <CircleAlert size={28} className="mt-0.5 shrink-0" aria-hidden="true" />
          No se puede entrar en silla de ruedas.
        </p>
      ) : (
        <p className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4 text-xl leading-snug">
          <Info size={28} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />
          <span>
            No sabemos si es accesible.{" "}
            {tel ? "Llama antes para preguntar." : isPlan ? "Pregunta antes de ir (en «Ver el plan» está el enlace con más información)." : "Pregunta antes de ir."}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-3">
        {item.href && (
          <Link href={item.href} className={`${btn} bg-degradado-fuerte text-white`}>
            Ver el plan
          </Link>
        )}
        {tel && (
          <a href={tel} className={`${btn} bg-green-700 text-white`}>
            <Phone size={24} aria-hidden="true" /> Llamar al {displayPhone(item.telefono)}
          </a>
        )}
        <a href={directionsUrl(item, home)} target="_blank" rel="noopener noreferrer" className={`${btn} border-2 border-slate-400 bg-white`}>
          <Route size={24} aria-hidden="true" /> Cómo llegar
          <span className="sr-only">(se abre el mapa del móvil)</span>
        </a>
        {onShowOnMap && (
          <button type="button" onClick={onShowOnMap} className={`${btn} border-2 border-slate-400 bg-white`}>
            <MapPinned size={24} aria-hidden="true" /> Ver en el mapa
          </button>
        )}
      </div>

      {item.fuente && (
        <a href={item.fuente.url} target="_blank" rel="noopener noreferrer" className="relative flex items-start gap-1.5 text-base text-gris hover:underline">
          <Database size={16} className="mt-1 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">Fuente:</span> {item.fuente.nombre} · {item.fuente.organismo}
          </span>
          <span className="sr-only">(abre la ficha del dataset en otra pestaña)</span>
        </a>
      )}
    </article>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-coral-texto" aria-hidden="true">{icon}</span>
      <p className="text-xl leading-snug">
        <span className="block text-base font-bold uppercase tracking-wide text-gris">{label}</span>
        {children}
      </p>
    </div>
  );
}

// Camino en el mapa del móvil (Google Maps abre la app si está instalada; si no, la web)
function directionsUrl(to: { lat: number; lon: number; minutos: number | null }, from: { lat: number; lon: number } | null): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${to.lat},${to.lon}`,
    travelmode: to.minutos != null && to.minutos > 25 ? "transit" : "walking",
  });
  if (from) params.set("origin", `${from.lat},${from.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
