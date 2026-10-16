"use client";

// Pide la ubicación al móvil (el navegador pregunta a la persona si da permiso).
// Devuelve el punto redondeado (~100 m) o un mensaje claro de por qué no se pudo.
import { useState } from "react";
import { isInComunidad, roundCoord, type Point } from "@/lib/location";

type Status = "idle" | "asking" | "error";

export function useMyLocation() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function locate(): Promise<Point | null> {
    setError(null);
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Este móvil o navegador no puede dar la ubicación. Escribe tu código postal.");
      return Promise.resolve(null);
    }
    setStatus("asking");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const p = { lat: roundCoord(coords.latitude), lon: roundCoord(coords.longitude) };
          if (!isInComunidad(p)) {
            setStatus("error");
            setError("Parece que ahora no estás en la Comunidad de Madrid. Escribe tu código postal.");
            return resolve(null);
          }
          setStatus("idle");
          resolve(p);
        },
        (e) => {
          setStatus("error");
          setError(
            e.code === e.PERMISSION_DENIED
              ? "No has dado permiso para usar tu ubicación. Si cambias de idea, actívalo en los ajustes del navegador. También puedes escribir tu código postal."
              : "No hemos podido saber dónde estás. Prueba otra vez o escribe tu código postal."
          );
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 }
      );
    });
  }

  return { locate, asking: status === "asking", error };
}
