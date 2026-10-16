"use client";

// Leaflet solo funciona en el navegador: el mapa se carga allí (sin renderizar en el servidor)
import dynamic from "next/dynamic";

const RouteMapLazy = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />,
});

export default RouteMapLazy;
