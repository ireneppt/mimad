"use client";

// Títulos traducidos de los planes para personas extranjeras, sin hacer esperar a la página:
// se pinta en español y, en cuanto llegan, se cambian (PlanTitlesProvider pide /api/traducir/titulos).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const Ctx = createContext<{ titles: Record<string, string>; lang: string }>({ titles: {}, lang: "es" });

export function PlanTitlesProvider({ ids, lang, children }: { ids: string[]; lang: string; children: ReactNode }) {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (lang === "es" || !key) return;
    let alive = true;
    fetch("/api/traducir/titulos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: key.split(","), idioma: lang }) })
      .then((r) => (r.ok ? r.json() : {}))
      .then((t) => alive && setTitles(t))
      .catch(() => {}); // si falla, se quedan en español
    return () => {
      alive = false;
    };
  }, [key, lang]);
  return <Ctx.Provider value={{ titles, lang }}>{children}</Ctx.Provider>;
}

export function PlanTitle({ id, children }: { id: string; children: ReactNode }) {
  const { titles, lang } = useContext(Ctx);
  return titles[id] ? <span lang={lang}>{titles[id]}</span> : <>{children}</>;
}
