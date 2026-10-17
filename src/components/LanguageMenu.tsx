"use client";

// Selector de idioma junto a la campana (personas extranjeras). Al abrir un plan, se
// traduce solo a este idioma. Los menús de la app siguen en español.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { TRANSLATE_LANGUAGES } from "@/lib/languages";
import { setLanguage } from "@/lib/languageActions";

const OPTIONS = [{ id: "es", short: "ES", label: "Español" }, ...TRANSLATE_LANGUAGES];

export default function LanguageMenu({ current }: { current: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const selected = OPTIONS.find((o) => o.id === current) ?? OPTIONS[0];

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
        aria-label={`Idioma: ${selected.label}. Cambiar idioma · Language`}
        className="flex h-14 w-14 items-center justify-center gap-0.5 rounded-full bg-slate-100 text-base font-bold disabled:opacity-60"
        disabled={pending}
      >
        {selected.short}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[600] mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-3 pb-2 pt-1 text-sm text-gris">Los planes se traducen a tu idioma al abrirlos · Plans are translated when you open them</p>
          <ul className="flex flex-col">
            {OPTIONS.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  lang={o.id}
                  onClick={() => choose(o.id)}
                  aria-current={o.id === selected.id}
                  className="flex h-12 w-full items-center justify-between rounded-xl px-3 text-left text-base hover:bg-slate-50"
                >
                  {o.label}
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
