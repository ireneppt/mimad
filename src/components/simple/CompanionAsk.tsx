"use client";

// Tras apuntarse a un plan: "¿Quieres que Lucía vaya contigo?".
// "Sí" abre WhatsApp con un mensaje ya escrito para su familiar; "No, gracias" lo cierra.
import { useState } from "react";
import { whatsappHref } from "@/lib/phoneLinks";
import { HeartHandshake, MessageCircle } from "lucide-react";

type Props = {
  companions: { id: string; nombre: string; telefono: string | null }[];
  plan: { titulo: string; cuando: string; lugar: string | null; url: string };
};

export default function CompanionAsk({ companions, plan }: Props) {
  const [closed, setClosed] = useState(false);
  const withPhone = companions.filter((c) => whatsappHref(c.telefono, ""));
  if (closed || withPhone.length === 0) return null;
  const names = withPhone.map((c) => c.nombre);
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} o ${names.at(-1)}`;

  const message = (nombre: string) =>
    `¡Hola, ${nombre}! Me he apuntado a «${plan.titulo}»: ${plan.cuando[0].toLowerCase()}${plan.cuando.slice(1)}` +
    `${plan.lugar ? `, en ${plan.lugar}` : ""}. ¿Quieres venir conmigo? Lo tienes aquí: ${plan.url}`;

  return (
    <section aria-labelledby="compania" className="flex flex-col gap-4 rounded-3xl border-2 border-coral/50 bg-crema p-5 text-xl leading-snug">
      <h2 id="compania" className="flex items-start gap-3 text-2xl font-bold">
        <HeartHandshake size={34} className="shrink-0 text-coral-texto" aria-hidden="true" />
        ¿Quieres que {who} vaya contigo?
      </h2>
      <p>Te preparamos un mensaje de WhatsApp para {who} con el plan. Solo tienes que darle a enviar.</p>
      {withPhone.map((c) => (
        <a
          key={c.id}
          href={whatsappHref(c.telefono, message(c.nombre))!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setClosed(true)}
          className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-green-700 px-4 py-2 text-center text-xl font-bold text-white"
        >
          <MessageCircle size={28} className="shrink-0" aria-hidden="true" />
          Sí, decírselo a {c.nombre}
          <span className="sr-only">(se abre WhatsApp)</span>
        </a>
      ))}
      <button
        type="button"
        onClick={() => setClosed(true)}
        className="flex h-16 items-center justify-center rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold"
      >
        No, gracias
      </button>
    </section>
  );
}
