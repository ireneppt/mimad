"use client";

// Mapa pequeño de "Cómo llegar": casa y plan, con una línea de puntos entre los dos.
// Leaflet + OpenStreetMap (sin claves). Quieto: solo para ver, no para mover.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

type Point = { lat: number; lon: number };

const pin = (label: string, color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);width:max-content">
      <span style="background:${color};color:#fff;font:700 15px/1.2 Outfit,sans-serif;padding:4px 10px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${label}</span>
      <span style="width:16px;height:16px;margin-top:3px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>
    </div>`,
  });

export default function RouteMap({ home, place, homeLabel }: { home: Point | null; place: Point; homeLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    const to = L.latLng(place.lat, place.lon);
    L.marker(to, { icon: pin("El plan", "#d6334a"), keyboard: false }).addTo(map);
    if (home) {
      const from = L.latLng(home.lat, home.lon);
      L.marker(from, { icon: pin(homeLabel, "#1d4ed8"), keyboard: false }).addTo(map);
      L.polyline([from, to], { color: "#1d4ed8", weight: 4, dashArray: "2 10", lineCap: "round" }).addTo(map);
      map.fitBounds(L.latLngBounds(from, to), { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView(to, 15);
    }
    return () => {
      map.remove();
    };
  }, [home, place, homeLabel]);

  return <div ref={ref} className="h-56 w-full overflow-hidden rounded-2xl border-2 border-slate-300" aria-hidden="true" />;
}
