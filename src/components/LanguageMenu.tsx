"use client";

// Selector de idioma junto a la campana (personas extranjeras). Al abrir un plan, se
// traduce solo a este idioma. Los menús de la app siguen en español.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { parseLanguage, TRANSLATE_LANGUAGES } from "@/lib/languages";
import { makeT } from "@/lib/i18n";
import { setLanguage } from "@/lib/languageActions";

const OPTIONS = [{ id: "es", short: "ES", label: "Español", flag: "es" }, ...TRANSLATE_LANGUAGES];

// Bandera pequeña (decorativa: el nombre del idioma ya va escrito)
function Flag({ code, className = "" }: { code: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/banderas/${code}.svg`} alt="" width={20} height={15} className={`h-[15px] w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10 ${className}`} />;
}

export default function LanguageMenu({ current }: { current: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const selected = OPTIONS.find((o) => o.id === current) ?? OPTIONS[0];
  const t = makeT(parseLanguage(current));

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (id: string) =>
    startTransition(async () => {
      await setLanguage(id);
      setOpen(false);
      router.refresh();
    });

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t("Idioma")}: ${selected.label}. ${t("Cambiar idioma")} · Language`}
        className="flex h-11 w-11 items-center justify-center gap-0.5 rounded-full bg-slate-100 text-sm font-bold transition-all duration-200 group-data-[compact=true]:h-9 group-data-[compact=true]:w-9 disabled:opacity-60"
        disabled={pending}
      >
        <Flag code={selected.flag} />
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[600] mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-3 pb-2 pt-1 text-sm text-gris">{t("Elige tu idioma. Los planes para personas extranjeras se traducen solos.")}</p>
          <ul className="flex flex-col">
            {OPTIONS.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  lang={o.id}
                  onClick={() => choose(o.id)}
                  aria-current={o.id === selected.id}
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base hover:bg-slate-50"
                >
                  <Flag code={o.flag} />
                  <span className="flex-1">{o.label}</span>
                  {o.id === selected.id && <Check size={18} className="text-coral-texto" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
