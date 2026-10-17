"use client";

// «Traducir»: para personas extranjeras. Elige idioma y Claude traduce el título, el horario
// y la descripción (los datos abiertos solo vienen en español). Se enseña debajo del original.
// Si ha elegido idioma en la cabecera (cookie), se traduce sola al abrir el plan.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Languages, LoaderCircle } from "lucide-react";

type Lang = { id: string; label: string; rtl?: boolean };
type Translation = { titulo: string; horario: string | null; descripcion: string | null };

export default function TranslatePlan({
  eventoId, languages, loggedIn, preferred,
}: {
  eventoId: string;
  languages: readonly Lang[];
  loggedIn: boolean;
  preferred: string | null; // idioma elegido en la cabecera
}) {
  const [lang, setLang] = useState(preferred ?? languages[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ lang: Lang; t: Translation }>();

  // Idioma elegido en la cabecera: se traduce sola (una vez) al abrir el plan
  const started = useRef(false);
  useEffect(() => {
    if (preferred && loggedIn && !started.current) {
      started.current = true;
      void translate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferred, loggedIn]);

  async function translate() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/traducir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento: eventoId, idioma: lang }) });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "No se ha podido traducir.");
      else setResult({ lang: languages.find((l) => l.id === lang)!, t: data });
    } catch {
      setError("No se ha podido traducir. Revisa la conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="flex items-center gap-2 text-base font-semibold">
        <Languages size={20} className="text-coral-texto" aria-hidden="true" /> Traducir este plan · Translate
      </p>
      {loggedIn ? (
        <div className="flex gap-2">
          <label htmlFor="idioma-traducir" className="sr-only">Idioma</label>
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
            {busy ? "Traduciendo…" : "Traducir"}
          </button>
        </div>
      ) : (
        <p className="text-base text-gris">
          <Link href="/login" className="font-semibold text-coral-texto underline">Entra en tu cuenta</Link> para traducir el plan a tu idioma.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {result && (
        <div lang={result.lang.id} dir={result.lang.rtl ? "rtl" : "ltr"} aria-live="polite" className="flex flex-col gap-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-lg font-bold leading-snug">{result.t.titulo}</p>
          {result.t.horario && <p className="whitespace-pre-line text-base text-gris">{result.t.horario}</p>}
          {result.t.descripcion && <p className="whitespace-pre-line text-base leading-relaxed">{result.t.descripcion}</p>}
          <p className="text-xs text-gris" dir="ltr" lang="es">Traducción automática con IA (Claude). El original en español es el que vale.</p>
        </div>
      )}
    </div>
  );
}
