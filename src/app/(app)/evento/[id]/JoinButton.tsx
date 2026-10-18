"use client";

// Botón "Inscribirme" / "Ya no voy". Si el plan coincide con otro de la agenda,
// pregunta antes de apuntar. Sin cuenta, lleva a crear una. Si el plan dura varios días
// (exposiciones…), antes pregunta qué día va a ir; los de un día se apuntan con un toque.
import Link from "next/link";
import { makeT, type Lang } from "@/lib/i18n";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarDays, CircleAlert, LoaderCircle } from "lucide-react";
import { joinEvent, leaveEvent, type JoinResult } from "./actions";
import { announceBotUpdate } from "@/components/WhatsappNotice";

type DayRange = { from: string; to: string; fromLabel: string; toLabel: string }; // "2026-10-18", "sábado 18 de octubre"

export default function JoinButton({
  eventoId, joined, loggedIn, lang, range, joinedDay,
}: {
  eventoId: string;
  joined: boolean;
  loggedIn: boolean;
  lang?: Lang;
  range?: DayRange | null; // solo en planes de varios días
  joinedDay?: string | null; // día elegido, ya escrito ("sábado 25 de octubre")
}) {
  const t = makeT(lang);
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState(range?.from ?? "");
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
            <button type="button" disabled={pending} onClick={() => run(() => joinEvent(eventoId, true, range ? day : undefined))} className="h-11 flex-1 rounded-xl bg-tinta font-medium text-white disabled:opacity-60">
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
          <p role="status" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-green-50 px-4 py-2 text-center text-lg font-semibold text-green-800">
            <CalendarCheck size={22} aria-hidden="true" />{" "}
            {joinedDay ? t("Te has apuntado para el {dia} · Está en tu agenda", { dia: joinedDay }) : t("Te has apuntado · Está en tu agenda")}
          </p>
          <button type="button" disabled={pending} onClick={() => run(() => leaveEvent(eventoId))} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-base font-medium disabled:opacity-60">
            {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
            {t("Ya no voy")}
          </button>
        </>
      ) : range && picking ? (
        // Plan de varios días: qué día va a ir (solo los días del plan, desde hoy)
        <div role="group" aria-labelledby="que-dia" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label id="que-dia" htmlFor="dia-plan" className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays size={22} className="text-coral-texto" aria-hidden="true" /> {t("¿Qué día vas a ir?")}
          </label>
          <p className="text-base text-gris">{t("Este plan dura varios días: del {inicio} al {fin}.", { inicio: range.fromLabel, fin: range.toLabel })}</p>
          <input
            id="dia-plan"
            type="date"
            value={day}
            min={range.from}
            max={range.to}
            onChange={(e) => setDay(e.target.value)}
            className="h-12 rounded-xl border border-slate-300 px-3 text-lg"
          />
          <div className="flex gap-2">
            <button type="button" disabled={pending || !day} onClick={() => run(() => joinEvent(eventoId, false, day))} className="bg-degradado flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-60">
              {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
              {t("Apuntarme ese día")}
            </button>
            <button type="button" onClick={() => setPicking(false)} className="h-12 flex-1 rounded-xl border border-slate-300 bg-white font-medium">
              {t("Cancelar")}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={pending} onClick={() => (range ? setPicking(true) : run(() => joinEvent(eventoId)))} className="bg-degradado flex h-14 items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-lg shadow-coral/25 disabled:opacity-70">
          {pending && <LoaderCircle size={22} className="animate-spin" aria-hidden="true" />}
          {t("Inscribirme")}
        </button>
      )}

      {result?.status === "error" && <p role="alert" className="text-center text-base text-red-800">{result.message}</p>}
    </div>
  );
}
