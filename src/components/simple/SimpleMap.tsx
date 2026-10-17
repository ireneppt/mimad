"use client";

// Mapa de la versión simplificada (Leaflet + OpenStreetMap, sin claves).
// Pocos puntos y grandes: cada plan o sitio es un círculo con su número; tu ubicación, una etiqueta "Tu ubicación".
// Sin gestos difíciles: botones grandes para acercar, alejar y ver todo.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { Expand, ZoomIn, ZoomOut } from "lucide-react";

export type Pin = { n: number; lat: number; lon: number; titulo: string };

const COLOR = { plan: "#b4233a", sitio: "#1d4ed8", elegido: "#1B2333", casa: "#15803d" };

function numberIcon(n: number, color: string, selected: boolean) {
  const size = selected ? 60 : 48;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${selected ? COLOR.elegido : color};color:#fff;
      border:3px solid #fff;${selected ? "outline:5px solid #facc15;" : ""}box-shadow:0 2px 6px rgba(0,0,0,.45);
      display:flex;align-items:center;justify-content:center;font:700 ${selected ? 28 : 23}px/1 Outfit,sans-serif">${n}</div>`,
  });
}

// Casa (icono de Lucide "house") + texto
const homeIcon = (label: string) =>
  L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="display:flex;align-items:center;gap:6px;transform:translate(-50%,-50%);width:max-content;background:${COLOR.casa};color:#fff;
      font:700 17px/1 Outfit,sans-serif;padding:8px 12px;border-radius:999px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45)">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      ${label}</div>`,
  });

export default function SimpleMap({
  pins, kind, home, selected, onSelect,
}: {
  pins: Pin[];
  kind: "plan" | "sitio";
  home: { lat: number; lon: number; label: string } | null;
  selected: number | null;
  onSelect: (n: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<number, L.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const fitAll = () => {
    const pts = [...pins.map((p) => L.latLng(p.lat, p.lon)), ...(home ? [L.latLng(home.lat, home.lon)] : [])];
    if (map.current && pts.length) map.current.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  };

  // Crear el mapa y los puntos
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    map.current = m;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(m);
    if (home) L.marker([home.lat, home.lon], { icon: homeIcon(home.label), keyboard: false, interactive: false, zIndexOffset: -100 }).addTo(m);
    markers.current.clear();
    pins.forEach((p) => {
      const mk = L.marker([p.lat, p.lon], { icon: numberIcon(p.n, COLOR[kind], false), title: `Número ${p.n}: ${p.titulo}`, alt: `Número ${p.n}`, riseOnHover: true })
        .on("click", () => onSelectRef.current(p.n))
        .addTo(m);
      markers.current.set(p.n, mk);
    });
    fitAll();
    // Con el teclado: Intro o espacio sobre un número también lo elige
    // (en el contenedor, porque Leaflet vuelve a crear el número al resaltarlo)
    const container = el.current;
    const onKey = (e: KeyboardEvent) => {
      const n = (e.target as HTMLElement).closest?.(".leaflet-marker-icon")?.getAttribute("title")?.match(/^Número (\d+)/)?.[1];
      if (n && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onSelectRef.current(Number(n));
      }
    };
    container.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("keydown", onKey);
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, home, kind]);

  // Resaltar el elegido y llevar el mapa hasta él
  useEffect(() => {
    markers.current.forEach((mk, n) => {
      mk.setIcon(numberIcon(n, COLOR[kind], n === selected));
      mk.setZIndexOffset(n === selected ? 1000 : 0);
    });
    const mk = selected != null ? markers.current.get(selected) : null;
    if (mk && map.current) map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 14), { animate: true });
  }, [selected, kind]);

  const btn = "flex h-16 flex-col items-center justify-center rounded-2xl border-2 border-slate-400 bg-white text-lg font-bold leading-tight";
  return (
    <div className="flex flex-col gap-3">
      <div ref={el} className="h-[360px] w-full overflow-hidden rounded-3xl border-2 border-slate-400" />
      <div className="grid grid-cols-3 gap-3">
        <button type="button" className={btn} onClick={() => map.current?.zoomIn()}>
          <ZoomIn size={26} aria-hidden="true" /> Acercar
        </button>
        <button type="button" className={btn} onClick={() => map.current?.zoomOut()}>
          <ZoomOut size={26} aria-hidden="true" /> Alejar
        </button>
        <button type="button" className={btn} onClick={fitAll}>
          <Expand size={26} aria-hidden="true" /> Ver todos
        </button>
      </div>
    </div>
  );
}
