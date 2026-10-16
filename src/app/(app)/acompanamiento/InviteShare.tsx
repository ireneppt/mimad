"use client";

// Compartir el código de invitación: por WhatsApp (mensaje ya escrito), con el menú
// de compartir del móvil o copiándolo.
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

export default function InviteShare({ codigo, nombre }: { codigo: string; nombre: string }) {
  const [copied, setCopied] = useState(false);
  const text =
    `¡Hola! Soy ${nombre}. Quiero acompañarte en MiMad para recomendarte planes cerca de casa. ` +
    `Entra en MiMad → Mi cuenta → «Añadir a una persona que me acompaña» y escribe este código: ${codigo}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-green-700 font-semibold text-white"
      >
        <MessageCircle size={20} aria-hidden="true" /> Enviar por WhatsApp
      </a>
      <button type="button" onClick={copy} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white font-semibold">
        {copied ? <Check size={20} className="text-green-700" aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
        {copied ? "Copiado" : "Copiar código"}
      </button>
    </div>
  );
}
