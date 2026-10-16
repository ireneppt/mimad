"use client";

// Barra de carga fina arriba del todo mientras se abre otra pantalla de la app.
// Next.js no avisa de cuándo empieza una navegación, así que se detecta aquí:
// empieza al tocar un enlace interno, buscar o ir atrás (también con el gesto de
// deslizar del iPhone), y termina cuando cambia la dirección.
//
// Pensada para el móvil:
// - Solo aparece si la carga tarda más de 150 ms: muchas pantallas ya están
//   precargadas y abren al instante, y sin esto la barra parpadearía en cada toque.
// - En la app instalada (PWA) no hay barra del navegador: esta es la única señal.
// - Con poca cobertura una pantalla puede tardar: se espera hasta 25 s.
// - Respeta la zona del notch / barra de estado.
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_DELAY_MS = 150;
const GIVE_UP_MS = 25_000;

type Timers = {
  show?: ReturnType<typeof setTimeout>;
  tick?: ReturnType<typeof setInterval>;
  safety?: ReturnType<typeof setTimeout>;
};

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0); // 0 = oculta
  const running = useRef(false);
  const timers = useRef<Timers>({});

  const clearAll = () => {
    clearTimeout(timers.current.show);
    clearInterval(timers.current.tick);
    clearTimeout(timers.current.safety);
    timers.current = {};
    running.current = false;
  };

  // Termina al llegar a la pantalla nueva
  useEffect(() => {
    if (!running.current) return;
    const wasVisible = !!timers.current.tick;
    clearAll();
    if (!wasVisible) return; // ha cargado antes de mostrarse: no se enseña nada
    setProgress(100);
    const hide = setTimeout(() => setProgress(0), 350);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]);

  useEffect(() => {
    function start() {
      if (running.current) return;
      running.current = true;
      timers.current.show = setTimeout(() => {
        setProgress(15);
        // Avanza cada vez más despacio sin llegar al final hasta que carga
        timers.current.tick = setInterval(() => setProgress((p) => p + (92 - p) * 0.08), 250);
      }, SHOW_DELAY_MS);
      // Por si algo falla: se quita sola
      timers.current.safety = setTimeout(() => {
        clearAll();
        setProgress(0);
      }, GIVE_UP_MS);
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
      // Solo formularios que abren otra pantalla (p. ej. el buscador); los botones de acciones tienen su propio aviso
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
      className="pointer-events-none fixed inset-x-0 top-0 z-[2500]"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        opacity: progress > 0 && progress < 100 ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        className="h-[5px] rounded-r-full"
        style={{
          width: `${progress}%`,
          transition: "width 0.25s ease-out",
          backgroundImage: "linear-gradient(90deg, #FF5A6E, #FFB86C, #FF5A6E)",
          backgroundSize: "200% 100%",
          animation: "barra-brillo 1.2s linear infinite",
          boxShadow: "0 1px 6px rgba(255, 90, 110, 0.55)",
        }}
      />
    </div>
  );
}
