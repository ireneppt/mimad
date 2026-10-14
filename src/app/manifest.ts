import type { MetadataRoute } from "next";

// Manifest de la PWA: permite instalar MiMad en el móvil
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiMad",
    short_name: "MiMad",
    description: "Madrid, mejor en compañía.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF4EC",
    theme_color: "#FF5A6E",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
