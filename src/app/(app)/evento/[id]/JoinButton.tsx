"use client";

// Botón "Inscribirme" / "Ya no voy". Si el plan coincide con otro de la agenda,
// pregunta antes de apuntar. Sin cuenta, lleva a crear una.
import Link from "next/link";
import { makeT, type Lang } from "@/lib/i18n";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { joinEvent, leaveEvent, type JoinResult } from "./actions";
import { announceBotUpdate } from "@/components/WhatsappNotice";

export default function JoinButton({ eventoId, joined, loggedIn, lang }: { eventoId: string; joined: boolean; loggedIn: boolean; lang?: Lang }) {
  const t = makeT(lang);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<JoinResult | null>(null);
  const here = `/evento/${encodeURIComponent(eventoId)}`;

  const run = (action: () => Promise<JoinResult>) =>
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r.status === "joined" || r.status === "left") router.refresh();
      if (r.status === "joined") announceBotUpdate(); // llega el aviso simulado de WhatsApp al momento
    });

  if (!loggedIn) {
    return (
      <div className="flex flex-col gap-2">
        <Link href="/registro" className="bg-degradado flex h-14 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-lg shadow-coral/25">
          {t("Crea tu cuenta para inscribirte")}
        </Link>
        <p className="text-center text-sm text-gris">
          {t("¿Ya tienes cuenta?")} <Link href={`/login?next=${encodeURIComponent(here)}`} className="font-medium text-coral-texto underline">{t("Inicia sesión")}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {result?.status === "conflict" && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-base text-amber-950">
            <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {(() => {
                // Una sola frase para que se traduzca bien; el título del otro plan, en negrita
                const [before, after = ""] = t("Coincide con {plan} ({cuando}), que ya está en tu agenda.", { cuando: result.conflict.cuando }).split("{plan}");
                return (
                  <>
                    {before}
                    <strong>{result.conflict.titulo}</strong>
                    {after}
                  </>
                );
              })()}
            </span>
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => joinEvent(eventoId, true))} className="h-11 flex-1 rounded-xl bg-tinta font-medium text-white disabled:opacity-60">
              {t("Apuntarme igualmente")}
            </button>
            <button type="button" onClick={() => setResult(null)} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white font-medium">
              {t("Cancelar")}
            </button>
          </div>
        </div>
      )}

      {joined ? (
        <>
          <p role="status" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-green-50 text-lg font-semibold text-green-800">
            <CalendarCheck size={22} aria-hidden="true" /> {t("Te has apuntado · Está en tu agenda")}
          </p>
          <button type="button" disabled={pending} onClick={() => run(() => leaveEvent(eventoId))} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-base font-medium disabled:opacity-60">
            {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
            {t("Ya no voy")}
          </button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => run(() => joinEvent(eventoId))} className="bg-degradado flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-lg shadow-coral/25 disabled:opacity-70">
          {pending && <LoaderCircle size={22} className="animate-spin" aria-hidden="true" />}
          {t("Inscribirme")}
        </button>
      )}

      {result?.status === "error" && <p role="alert" className="text-center text-base text-red-800">{result.message}</p>}
    </div>
  );
}
