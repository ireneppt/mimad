"use client";

// Compartir un plan: menú de compartir del móvil o, si no hay, copiar el enlace
import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} · en MiMad`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // La persona ha cerrado el menú de compartir: no pasa nada
    }
  }

  return (
    <button type="button" onClick={share} aria-label={copied ? "Enlace copiado" : "Compartir este plan"} className="flex h-12 w-12 items-center justify-center rounded-full">
      {copied ? <Check size={24} aria-hidden="true" /> : <Share2 size={24} aria-hidden="true" />}
    </button>
  );
}
