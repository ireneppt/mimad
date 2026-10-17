"use client";

// Chat del Asistente: la persona escribe (o toca un ejemplo) y /api/asistente responde
// con 1-3 planes reales en tarjetas, cada una con su "por qué" y la fuente de datos abiertos.
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check, Clock, Database, Info, Languages, LoaderCircle, MapPin, Music, Palette, SendHorizontal, Sparkles, Trees,
  type LucideIcon,
} from "lucide-react";
import { joinEvent } from "@/app/(app)/evento/[id]/actions";
import { announceBotUpdate } from "@/components/WhatsappNotice";
import type { PlanTarjeta, RespuestaAsistente } from "@/app/api/asistente/route";

type Mensaje =
  | { rol: "usuario"; texto: string }
  | { rol: "asistente"; texto: string; planes?: PlanTarjeta[]; motor?: "claude" | "reglas"; motivo?: string; error?: boolean };

const EJEMPLOS: { texto: string; icon: LucideIcon }[] = [
  { texto: "Algo al aire libre", icon: Trees },
  { texto: "Un taller creativo", icon: Palette },
  { texto: "Música esta semana", icon: Music },
  { texto: "Practicar idiomas", icon: Languages },
];

const SEGUIR = ["Más cerca", "Solo gratis", "Otros planes", "Este fin de semana"];

export default function AssistantChat({ saludo, loggedIn }: { saludo: string; loggedIn: boolean }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ rol: "asistente", texto: saludo }]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const finalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, pensando]);

  async function enviar(t: string) {
    const mensaje = t.trim();
    if (!mensaje || pensando) return;
    const historial = mensajes.slice(1).map((m) => ({ rol: m.rol, texto: m.texto }));
    const vistos = mensajes.flatMap((m) => (m.rol === "asistente" ? (m.planes ?? []).map((p) => p.id) : []));
    setMensajes((ms) => [...ms, { rol: "usuario", texto: mensaje }]);
    setTexto("");
    setPensando(true);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje, historial, vistos }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const r = (await res.json()) as RespuestaAsistente;
      setMensajes((ms) => [...ms, { rol: "asistente", texto: r.texto, planes: r.planes, motor: r.motor, motivo: r.motivo }]);
    } catch {
      setMensajes((ms) => [...ms, { rol: "asistente", texto: "No he podido buscar planes ahora. Prueba otra vez en un momento.", error: true }]);
    } finally {
      setPensando(false);
    }
  }

  const ultimo = mensajes.at(-1);
  const hayPlanes = ultimo?.rol === "asistente" && !!ultimo.planes?.length;

  return (
    <>
      <section aria-label="Conversación" aria-live="polite" className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-5">
        <p className="self-center rounded-full bg-slate-200 px-4 py-1 text-sm text-gris">Hoy</p>
        {mensajes.map((m, i) =>
          m.rol === "usuario" ? (
            <p key={i} className="bg-degradado max-w-[85%] self-end rounded-3xl rounded-br-md px-5 py-3 text-lg leading-snug text-tinta">
              <span className="sr-only">Tú: </span>
              {m.texto}
            </p>
          ) : (
            <div key={i} className="flex flex-col gap-3">
              <Burbuja error={m.error}>{m.texto}</Burbuja>
              {i === 0 && mensajes.length === 1 && (
                <div className="flex flex-wrap gap-2 pl-12">
                  {EJEMPLOS.map(({ texto: t, icon: Icon }) => (
                    <button key={t} type="button" onClick={() => enviar(t)} className="flex h-11 items-center gap-2 rounded-full border border-coral/40 bg-white px-4 font-semibold text-coral-texto">
                      <Icon size={18} aria-hidden="true" /> {t}
                    </button>
                  ))}
                </div>
              )}
              {!!m.planes?.length && (
                <ul className="relative -mx-4 flex snap-x snap-mandatory scroll-pl-16 gap-3 overflow-x-auto px-4 pb-2 pl-16" aria-label="Planes recomendados">
                  {m.planes.map((p) => (
                    <li key={p.id} className="w-[85%] max-w-[330px] shrink-0 snap-start">
                      <Tarjeta plan={p} loggedIn={loggedIn} />
                    </li>
                  ))}
                </ul>
              )}
              {!!m.planes?.length && (
                <p className="flex items-start gap-1.5 pl-12 text-sm text-gris">
                  <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    {m.motor === "claude" ? "Elegidos con IA (Claude) entre" : "Elegidos entre"} las actividades de los datos abiertos. Revisa siempre la fecha y el lugar.
                    {m.motivo && <span className="block">Sin IA: {m.motivo}.</span>}
                  </span>
                </p>
              )}
            </div>
          )
        )}
        {pensando && (
          <Burbuja>
            <span className="flex items-center gap-2 text-gris">
              <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Buscando planes para ti…
            </span>
          </Burbuja>
        )}
        <div ref={finalRef} />
      </section>

      <div className="sticky bottom-20 flex flex-col gap-2 bg-slate-50/95 px-4 pb-3 pt-2 backdrop-blur">
        {hayPlanes && !pensando && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {SEGUIR.map((t) => (
              <button key={t} type="button" onClick={() => enviar(t)} className="h-11 shrink-0 rounded-full border border-slate-300 bg-white px-4 font-medium">
                {t}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pl-5 shadow-sm"
        >
          <label htmlFor="pregunta" className="sr-only">Escribe qué te apetece</label>
          <input
            id="pregunta"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={500}
            placeholder="Escribe qué te apetece…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-gris"
          />
          <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar" className="bg-degradado flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-tinta disabled:opacity-50">
            <SendHorizontal size={22} aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  );
}

function Burbuja({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex items-end gap-2">
      <span className="bg-degradado flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" aria-hidden="true">
        <Sparkles size={20} />
      </span>
      <p className={`max-w-[85%] rounded-3xl rounded-bl-md border bg-white px-5 py-3 text-lg leading-snug ${error ? "border-amber-300" : "border-slate-200"}`}>
        <span className="sr-only">Asistente: </span>
        {children}
      </p>
    </div>
  );
}

function Tarjeta({ plan, loggedIn }: { plan: PlanTarjeta; loggedIn: boolean }) {
  const [estado, setEstado] = useState<"" | "apuntada" | "error" | "choque">(plan.apuntada ? "apuntada" : "");
  const [choque, setChoque] = useState("");
  const [pending, startTransition] = useTransition();
  const href = `/evento/${encodeURIComponent(plan.id)}`;

  const apuntarme = () =>
    startTransition(async () => {
      const r = await joinEvent(plan.id);
      if (r.status === "joined") {
        setEstado("apuntada");
        announceBotUpdate(); // llega el aviso simulado de WhatsApp al momento
      } else if (r.status === "conflict") {
        setChoque(`${r.conflict.titulo} (${r.conflict.cuando})`);
        setEstado("choque");
      } else setEstado("error");
    });

  return (
    <article className="flex h-full flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4" aria-labelledby={`t-${plan.id}`}>
      {plan.gusto && (
        <span className="inline-flex items-center gap-1 self-start rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-semibold text-green-800">
          <Check size={14} aria-hidden="true" /> Encaja contigo: {plan.gusto}
        </span>
      )}
      <h3 id={`t-${plan.id}`} className="text-lg font-bold leading-snug">{plan.titulo}</h3>
      <p className="flex items-start gap-1.5 text-gris">
        <Clock size={16} className="mt-1 shrink-0" aria-hidden="true" /> {plan.cuando}
      </p>
      {(plan.lugar || plan.minutos != null) && (
        <p className="flex items-start gap-1.5 text-gris">
          <MapPin size={16} className="mt-1 shrink-0" aria-hidden="true" />
          {[plan.lugar, plan.minutos != null && `${plan.minutos} min andando`, plan.gratis && "Gratis"].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="rounded-2xl bg-crema p-3 leading-snug">
        <strong className="text-coral-texto">Por qué:</strong> {plan.porque}
      </p>
      {plan.fuente && (
        <a href={plan.fuente.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-sm text-gris hover:underline">
          <Database size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">Fuente:</span> {plan.fuente.nombre} · {plan.fuente.organismo}
          </span>
          <span className="sr-only">(abre la ficha del dataset en otra pestaña)</span>
        </a>
      )}
      {estado === "choque" && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          Coincide con otro plan de tu agenda: {choque}. Ábrelo para elegir.
        </p>
      )}
      {estado === "error" && <p role="alert" className="text-sm text-coral-texto">No se ha podido apuntar. Prueba desde el plan.</p>}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
        <Link href={href} className="flex h-12 items-center justify-center rounded-2xl border border-slate-300 font-semibold">
          Ver
        </Link>
        {estado === "apuntada" ? (
          <span className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-green-50 font-semibold text-green-800" role="status">
            <Check size={18} aria-hidden="true" /> Ya vas
          </span>
        ) : !loggedIn ? (
          <Link href="/registro" className="bg-degradado flex h-12 items-center justify-center rounded-2xl text-center text-sm font-semibold leading-tight text-tinta">
            Crea tu cuenta para ir
          </Link>
        ) : estado === "choque" ? (
          <Link href={href} className="bg-degradado flex h-12 items-center justify-center rounded-2xl font-semibold text-tinta">
            Elegir
          </Link>
        ) : (
          <button type="button" onClick={apuntarme} disabled={pending} className="bg-degradado flex h-12 items-center justify-center gap-1.5 rounded-2xl font-semibold text-tinta disabled:opacity-60">
            {pending ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />} Me apunto
          </button>
        )}
      </div>
    </article>
  );
}
