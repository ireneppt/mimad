"use client";

// Mapa con Leaflet + OpenStreetMap (sin claves). Los puntos cercanos entre sí se agrupan
// en un marcador "apilado" con el símbolo más frecuente y una burbuja con el número;
// al tocar un punto se abre su ficha abajo.
// Agrupación propia (sin librerías), por distancia en la pantalla: se recalcula al mover o hacer zoom.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Accessibility, Clock, Database, ExternalLink, LoaderCircle, LocateFixed, MapPin, Phone, Route, X, type LucideIcon,
} from "lucide-react";
import { categoryInfo, placeIcon } from "@/lib/categories";
import { useMyLocation } from "@/components/useMyLocation";
import { setHereLocation } from "@/lib/locationActions";
import type { MapPoint, MapSource } from "./types";

type P = { lat: number; lon: number };
const CLUSTER_PX = 52; // dos marcadores más cerca que esto (en pantalla) se agrupan
const PLACE_COLOR = "#1d4ed8"; // lugares en azul; planes en coral
const EVENT_COLOR = "#d6334a";

const iconOf = (p: MapPoint): LucideIcon => (p.kind === "lugar" ? placeIcon(p.label) : categoryInfo(p.category).icon);
const iconKey = (p: MapPoint) => `${p.kind}-${p.kind === "lugar" ? p.label : categoryInfo(p.category).label}`.replace(/[^\w-]/g, "_");

export default function MapExplorer({
  points, sources, origin, center,
}: {
  points: MapPoint[];
  sources: Record<string, MapSource>;
  origin: P | null;
  center: P;
}) {
  const router = useRouter();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { locate, asking, error: geoError } = useMyLocation();
  const [pending, startTransition] = useTransition();

  const selected = points.find((p) => p.id === selectedId) ?? null;

  // Iconos distintos que se usan (se dibujan una vez en un "sprite" SVG y los marcadores lo reutilizan)
  const icons = useMemo(() => {
    const m = new Map<string, LucideIcon>();
    points.forEach((p) => m.set(iconKey(p), iconOf(p)));
    return [...m.entries()];
  }, [points]);

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lon], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", () => setSelectedId(null));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // El centro inicial solo se usa al crear el mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Punto azul "estás aquí / tu casa" y centrar cuando cambia la ubicación
  const oLat = origin?.lat;
  const oLon = origin?.lon;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    me.current?.remove();
    if (oLat != null && oLon != null) {
      me.current = L.circleMarker([oLat, oLon], {
        radius: 9, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1, interactive: false,
      }).addTo(m);
      m.setView([oLat, oLon], Math.max(m.getZoom(), 14));
    }
  }, [oLat, oLon]);

  // Pintar marcadores (y volver a agruparlos al mover o hacer zoom)
  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;

    function draw() {
      group!.clearLayers();
      const bounds = m!.getBounds().pad(0.3);
      const visible = points
        .filter((p) => p.id !== selectedId && bounds.contains([p.lat, p.lon])) // el elegido se pinta aparte
        .map((p) => ({ p, pt: m!.latLngToLayerPoint([p.lat, p.lon]) }));

      // Agrupar por distancia: cada punto sin grupo empieza uno y se lleva a los que
      // estén a menos de CLUSTER_PX. Así dos grupos nunca quedan pegados.
      const used = new Array(visible.length).fill(false);
      const clusters: { seed: MapPoint; members: MapPoint[] }[] = [];
      for (let i = 0; i < visible.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        const members = [visible[i].p];
        for (let j = i + 1; j < visible.length; j++) {
          if (!used[j] && visible[i].pt.distanceTo(visible[j].pt) < CLUSTER_PX) {
            used[j] = true;
            members.push(visible[j].p);
          }
        }
        clusters.push({ seed: visible[i].p, members });
      }

      for (const { seed, members } of clusters) {
        // El símbolo del grupo es el del tipo de plan más frecuente
        const counts = new Map<string, { n: number; p: MapPoint }>();
        members.forEach((p) => {
          const k = iconKey(p);
          const c = counts.get(k);
          counts.set(k, { n: (c?.n ?? 0) + 1, p: c?.p ?? p });
        });
        const top = [...counts.values()].sort((a, b) => b.n - a.n)[0].p;
        const many = members.length > 1;
        const isPlace = top.kind === "lugar";
        const color = isPlace ? PLACE_COLOR : EVENT_COLOR;
        const ring = isPlace ? "#bfdbfe" : "#ffe1e5";
        // Un grupo se ve como un montón de marcadores: una sombra de otro detrás y la burbuja con el número
        const stack = many
          ? `<span style="position:absolute;left:5px;top:-4px;width:44px;height:44px;border-radius:999px;background:#fff;border:2px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,.18)"></span>`
          : "";
        const badge = many
          ? `<span style="position:absolute;right:-8px;top:-8px;min-width:26px;height:26px;padding:0 6px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(135deg,#FF5A6E,#FFB86C);color:#fff;font:700 14px/1 Outfit,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)">${members.length > 99 ? "99+" : members.length}</span>`
          : "";

        L.marker([seed.lat, seed.lon], {
          title: many ? `${members.length} planes o lugares aquí: toca para acercar` : seed.title,
          alt: many ? `${members.length} planes o lugares` : seed.title,
          keyboard: true,
          icon: L.divIcon({
            className: "",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            html: `<span style="position:relative;display:block;width:44px;height:44px">${stack}<span style="position:relative;display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:999px;background:#fff;color:${color};box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid ${ring}"><svg width="22" height="22"><use href="#mi-${iconKey(top)}"/></svg></span>${badge}</span>`,
          }),
        })
          .on("click", () => {
            if (!many) return setSelectedId(seed.id);
            const b = L.latLngBounds(members.map((p) => [p.lat, p.lon] as [number, number]));
            if (m!.getZoom() >= 18 || b.getNorthEast().equals(b.getSouthWest())) {
              // Todos en el mismo sitio (p. ej. varias actividades de un CEPI): abrir el primero
              setSelectedId(seed.id);
            } else {
              m!.fitBounds(b, { padding: [70, 70], maxZoom: 18 });
            }
          })
          .addTo(group!);
      }

      // El elegido: chincheta grande con el degradado de la marca
      const sel = points.find((p) => p.id === selectedId);
      if (sel) {
        L.marker([sel.lat, sel.lon], {
          title: sel.title,
          zIndexOffset: 1000,
          icon: L.divIcon({
            className: "",
            iconSize: [56, 68],
            iconAnchor: [28, 66],
            html: `<span style="position:relative;display:flex;width:56px;height:56px;align-items:center;justify-content:center;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#FFB86C,#FF5A6E);box-shadow:0 4px 10px rgba(214,51,74,.45);border:3px solid #fff"><svg width="26" height="26" style="transform:rotate(45deg);color:#fff"><use href="#mi-${iconKey(sel)}"/></svg></span>`,
          }),
        }).addTo(group!);
      }
    }

    draw();
    m.on("moveend zoomend", draw);
    return () => {
      m.off("moveend zoomend", draw);
    };
  }, [points, selectedId]);

  // Al elegir un punto, centrarlo un poco por encima de la ficha
  useEffect(() => {
    const m = map.current;
    if (!m || !selected) return;
    const target = m.project([selected.lat, selected.lon], m.getZoom()).add([0, 110]);
    m.panTo(m.unproject(target, m.getZoom()), { animate: true });
  }, [selected]);

  async function goToMe() {
    const p = await locate();
    if (!p) return;
    map.current?.setView([p.lat, p.lon], 15);
    const f = new FormData();
    f.set("lat", String(p.lat));
    f.set("lon", String(p.lon));
    // Las distancias pasan a contarse desde aquí (cookie de 3 horas, no se guarda)
    startTransition(async () => {
      await setHereLocation(f);
      router.refresh();
    });
  }

  return (
    <div className="absolute inset-0">
      {/* Sprite con los iconos de Lucide que usan los marcadores */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        {icons.map(([key, Icon]) => (
          <symbol key={key} id={`mi-${key}`} viewBox="0 0 22 22">
            <Icon size={22} />
          </symbol>
        ))}
      </svg>

      <div ref={el} className="h-full w-full" />

      <button
        type="button"
        onClick={goToMe}
        disabled={asking || pending}
        aria-label="Centrar el mapa en dónde estoy"
        className="absolute right-4 top-4 z-[500] flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-700 shadow-lg disabled:opacity-70"
      >
        {asking || pending ? <LoaderCircle size={26} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={26} aria-hidden="true" />}
      </button>
      {geoError && (
        <p role="alert" className="absolute inset-x-4 top-36 z-[500] rounded-xl bg-white p-3 text-sm text-red-800 shadow-lg">{geoError}</p>
      )}

      {points.length === 0 && (
        <p className="absolute inset-x-6 top-1/2 z-[500] -translate-y-1/2 rounded-2xl bg-white p-4 text-center text-base shadow-lg">
          No hay planes aquí para esas fechas. Prueba con «Esta semana» o activa «Lugares».
        </p>
      )}

      {selected && <Sheet point={selected} source={sources[selected.source]} origin={origin} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// Ficha de abajo con lo esencial del punto elegido
function Sheet({ point: p, source, origin, onClose }: { point: MapPoint; source?: MapSource; origin: P | null; onClose: () => void }) {
  const Icon = iconOf(p);
  const directions = new URLSearchParams({ api: "1", destination: `${p.lat},${p.lon}`, travelmode: "walking" });
  if (origin) directions.set("origin", `${origin.lat},${origin.lon}`);

  return (
    <div role="dialog" aria-label={p.title} className="absolute inset-x-3 bottom-3 z-[600] flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${p.kind === "lugar" ? "bg-blue-50 text-blue-800" : "bg-degradado text-white"}`}
          aria-hidden="true"
        >
          <Icon size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-coral-texto">{p.label}</p>
          <h2 className="line-clamp-2 text-lg font-bold leading-snug">{p.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-base text-gris">
        {p.when && (
          <li className="flex items-center gap-1.5">
            <Clock size={16} aria-hidden="true" /> {p.when}
            {p.free && <strong className="text-coral-texto"> · Gratis</strong>}
          </li>
        )}
        {p.schedule && (
          <li className="flex items-center gap-1.5">
            <Clock size={16} aria-hidden="true" /> <span className="line-clamp-1">{p.schedule}</span>
          </li>
        )}
        {p.accessible && (
          <li className="flex items-center gap-1.5">
            <Accessibility size={16} aria-hidden="true" /> Accesible
          </li>
        )}
        {p.km && (
          <li className="flex items-center gap-1.5">
            <MapPin size={16} aria-hidden="true" /> {p.km}
          </li>
        )}
        {p.address && !p.when && <li className="w-full">{p.address}</li>}
        {p.phone && (
          <li className="flex items-center gap-1.5">
            <Phone size={16} aria-hidden="true" /> <span className="select-all">{p.phone}</span>
          </li>
        )}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://www.google.com/maps/dir/?${directions}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 text-base font-semibold"
        >
          <Route size={20} aria-hidden="true" /> Cómo llegar
          <span className="sr-only">(se abre Google Maps)</span>
        </a>
        {p.kind === "evento" ? (
          <Link href={`/evento/${encodeURIComponent(p.id)}`} className="bg-degradado flex h-12 items-center justify-center rounded-2xl text-base font-semibold text-white">
            Ver detalles
          </Link>
        ) : p.web ? (
          <a href={p.web} target="_blank" rel="noopener noreferrer" className="bg-degradado flex h-12 items-center justify-center gap-1.5 rounded-2xl text-base font-semibold text-white">
            Ver la web <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : (
          <span className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-center text-sm text-gris">Sin web oficial</span>
        )}
      </div>

      {source?.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-xs text-gris hover:underline">
          <Database size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span><span className="font-medium">Fuente:</span> {source?.label ?? p.source}</span>
        </a>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-gris">
          <Database size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> <span><span className="font-medium">Fuente:</span> {source?.label ?? p.source}</span>
        </p>
      )}
    </div>
  );
}
