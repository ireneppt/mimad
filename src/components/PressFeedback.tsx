"use client";

// Al tocar un botón o enlace en el móvil, una vibración cortísima (10 ms) para notar
// que se ha pulsado. Solo en pantallas táctiles y donde el móvil lo permite (Android;
// el iPhone no deja vibrar desde la web). La animación visual está en globals.css.
import { useEffect } from "react";

export default function PressFeedback() {
  useEffect(() => {
    if (!("vibrate" in navigator) || !window.matchMedia("(pointer: coarse)").matches) return;
    const onPress = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("button:not(:disabled), a[href], [role='button'], summary");
      if (el) navigator.vibrate(10);
    };
    window.addEventListener("pointerdown", onPress, { passive: true });
    return () => window.removeEventListener("pointerdown", onPress);
  }, []);
  return null;
}
