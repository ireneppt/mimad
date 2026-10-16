"use client";

// Leaflet solo funciona en el navegador: el mapa se carga allí (sin renderizar en el servidor)
import dynamic from "next/dynamic";

const MapExplorerLazy = dynamic(() => import("./MapExplorer"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" aria-hidden="true" />,
});

export default MapExplorerLazy;
