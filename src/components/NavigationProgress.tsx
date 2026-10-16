"use client";

// Barra de carga fina arriba del todo mientras se abre otra pantalla de la app.
// Next.js no avisa de cuándo empieza una navegación, así que se detecta aquí:
// empieza al tocar un enlace interno, buscar o ir atrás, y termina cuando cambia la dirección.
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0); // 0 = oculta
  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; safety?: ReturnType<typeof setTimeout> }>({});

  // Termina al llegar a la pantalla nueva
  useEffect(() => {
    if (!timers.current.tick) return;
    clearInterval(timers.current.tick);
    clearTimeout(timers.current.safety);
    timers.current = {};
    setProgress(100);
    const hide = setTimeout(() => setProgress(0), 300);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]);

  useEffect(() => {
    function start() {
      if (timers.current.tick) return;
      setProgress(12);
      // Avanza cada vez más despacio sin llegar nunca al final hasta que carga
      timers.current.tick = setInterval(() => setProgress((p) => p + (90 - p) * 0.12), 200);
      // Por si algo falla: se quita sola a los 12 segundos
      timers.current.safety = setTimeout(() => {
        clearInterval(timers.current.tick);
        timers.current = {};
        setProgress(0);
      }, 12_000);
    }

    const isSamePage = (url: URL) => url.pathname === location.pathname && url.search === location.search;

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || isSamePage(url)) return; // otra web o solo cambia el #
      if (url.pathname.endsWith("/calendario")) return; // descarga del calendario
      start();
    }

    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement;
      // Solo formularios que abren otra pantalla (p. ej. el buscador); los de acciones tienen su propio aviso
      if (form.method.toLowerCase() !== "get") return;
      start();
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", start);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", start);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[2500] h-1"
      style={{ opacity: progress > 0 && progress < 100 ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <div
        className="h-full rounded-r-full"
        style={{
          width: `${progress}%`,
          transition: "width 0.2s ease-out",
          backgroundImage: "linear-gradient(90deg, #FF5A6E, #FFB86C, #FF5A6E)",
          backgroundSize: "200% 100%",
          animation: "barra-brillo 1.2s linear infinite",
          boxShadow: "0 0 8px rgba(255, 90, 110, 0.6)",
        }}
      />
    </div>
  );
}
