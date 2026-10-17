"use client";

// «Traducir»: para personas extranjeras. Elige idioma y Claude traduce el título, el horario
// y la descripción (los datos abiertos solo vienen en español). Se enseña debajo del original.
// Si ha elegido idioma en la cabecera y es un plan para personas extranjeras (CEPI, idiomas),
// se traduce sola al abrirlo; los demás planes, con el botón.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Languages, LoaderCircle } from "lucide-react";
import { makeT, type Lang as UiLang } from "@/lib/i18n";

type Lang = { id: string; label: string; rtl?: boolean };
type Translation = { titulo: string; horario: string | null; descripcion: string | null };

export default function TranslatePlan({
  eventoId, languages, loggedIn, lang: uiLang, auto,
}: {
  eventoId: string;
  languages: readonly Lang[];
  loggedIn: boolean;
  lang: UiLang; // idioma elegido en la cabecera ("es" si no ha elegido)
  auto: boolean; // traducir sola al abrir
}) {
  const t = makeT(uiLang);
  const [lang, setLang] = useState(uiLang !== "es" ? uiLang : languages[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ lang: Lang; t: Translation }>();

  // Se traduce sola (una vez) al abrir el plan
  const started = useRef(false);
  useEffect(() => {
    if (auto && loggedIn && !started.current) {
      started.current = true;
      void translate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, loggedIn]);

  async function translate() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/traducir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento: eventoId, idioma: lang }) });
      const data = await res.json();
      if (!res.ok) setError(data.error ? t(data.error) : t("No se ha podido traducir."));
      else setResult({ lang: languages.find((l) => l.id === lang)!, t: data });
    } catch {
      setError(t("No se ha podido traducir. Revisa la conexión."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="flex items-center gap-2 text-base font-semibold">
        <Languages size={20} className="text-coral-texto" aria-hidden="true" /> {t("Traducir este plan")}{uiLang === "es" ? " · Translate" : ""}
      </p>
      {loggedIn ? (
        <div className="flex gap-2">
          <label htmlFor="idioma-traducir" className="sr-only">{t("Idioma")}</label>
          <select
            id="idioma-traducir"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id} lang={l.id}>{l.label}</option>
            ))}
          </select>
          <button type="button" onClick={translate} disabled={busy} className="flex h-12 items-center gap-2 rounded-xl bg-tinta px-4 font-medium text-white disabled:opacity-60">
            {busy && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
            {busy ? t("Traduciendo…") : t("Traducir")}
          </button>
        </div>
      ) : (
        <p className="text-base text-gris">
          <Link href="/login" className="font-semibold text-coral-texto underline">{t("Entra en tu cuenta")}</Link> {t("para traducir el plan a tu idioma.")}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {result && (
        <div lang={result.lang.id} dir={result.lang.rtl ? "rtl" : "ltr"} aria-live="polite" className="flex flex-col gap-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-lg font-bold leading-snug">{result.t.titulo}</p>
          {result.t.horario && <p className="whitespace-pre-line text-base text-gris">{result.t.horario}</p>}
          {result.t.descripcion && <p className="whitespace-pre-line text-base leading-relaxed">{result.t.descripcion}</p>}
          <p className="text-xs text-gris" dir="ltr">{t("Traducción automática con IA (Claude). El original en español es el que vale.")}</p>
        </div>
      )}
    </div>
  );
}
