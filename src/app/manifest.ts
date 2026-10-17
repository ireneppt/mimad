import type { MetadataRoute } from "next";

// Manifest de la PWA: permite instalar MiMad en el móvil. Con "shortcuts", al mantener
// pulsado el icono salen accesos directos al mapa, la agenda, el asistente y la versión sencilla.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MiMad",
    short_name: "MiMad",
    description: "Madrid, mejor en compañía. Planes y actividades cerca de ti con datos abiertos de la Comunidad de Madrid.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF4EC",
    theme_color: "#FF5A6E",
    lang: "es",
    categories: ["lifestyle", "social", "events"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mapa de planes", short_name: "Mapa", url: "/mapa", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Mi agenda", short_name: "Agenda", url: "/agenda", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Pedir recomendaciones", short_name: "Asistente", url: "/asistente", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Versión simplificada", short_name: "Sencilla", url: "/simple", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
