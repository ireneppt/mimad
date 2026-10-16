"use client";

// Al llegar a una pantalla con "#seccion" en la dirección (p. ej. "Cómo llegar" desde la agenda),
// baja hasta esa sección. Next.js no siempre lo hace al cambiar de pantalla.
import { useEffect } from "react";

export default function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    // Tras pintar la pantalla, para que la posición sea la buena
    const t = setTimeout(() => el.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, []);
  return null;
}
