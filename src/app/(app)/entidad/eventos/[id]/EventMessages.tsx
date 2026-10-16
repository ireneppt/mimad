"use client";

// Mensajes de la entidad a las personas apuntadas: escribir y borrar los enviados.
// Solo escribe la entidad (canal moderado); cada mensaje llega como aviso a la campana.
import { useActionState, useEffect, useRef } from "react";
import { CircleCheck, LoaderCircle, Megaphone, Send, Trash2 } from "lucide-react";
import { FormError } from "@/components/forms";
import { timeAgo } from "@/lib/companion";
import { deleteMessage, sendMessage, type MessageState } from "../../actions";

type Msg = { id: string; texto: string; created_at: string };

export default function EventMessages({ eventoId, mensajes, apuntados, active }: { eventoId: string; mensajes: Msg[]; apuntados: number; active: boolean }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  const text = useRef<HTMLTextAreaElement>(null);

  // Al enviar bien, se vacía el cuadro de texto
  useEffect(() => {
    if (state.sent && text.current) text.current.value = "";
  }, [state.sent]);

  return (
    <section aria-labelledby="mensajes" className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 id="mensajes" className="flex items-center gap-2 text-xl font-bold">
          <Megaphone size={22} className="text-coral-texto" aria-hidden="true" /> Mensajes a las personas apuntadas
        </h2>
        <p className="mt-1 text-sm text-gris">
          Solo tu entidad puede escribir aquí. Cada mensaje llega como aviso a {apuntados === 1 ? "la persona apuntada" : `las ${apuntados} personas apuntadas`}.
        </p>
      </div>

      {active && (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="evento_id" value={eventoId} />
          <label htmlFor="texto" className="sr-only">Mensaje</label>
          <textarea
            ref={text}
            id="texto"
            name="texto"
            required
            maxLength={1000}
            rows={3}
            placeholder="Por ejemplo: «Cambiamos a la sala 2» o «Traed ropa cómoda»"
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-lg focus:border-tinta focus:outline-none"
          />
          <FormError message={state.error} />
          {state.ok && (
            <p role="status" className="flex items-center gap-2 text-base text-green-800">
              <CircleCheck size={18} aria-hidden="true" /> {state.ok}
            </p>
          )}
          <button type="submit" disabled={pending} className="bg-degradado flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white disabled:opacity-70">
            {pending ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />} Enviar mensaje
          </button>
        </form>
      )}

      {mensajes.length === 0 ? (
        <p className="text-base text-gris">Aún no has enviado ningún mensaje.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mensajes.map((m) => (
            <li key={m.id} className="flex gap-3 rounded-2xl bg-crema p-4">
              <p className="flex-1 whitespace-pre-line text-base">
                {m.texto}
                <span className="mt-1 block text-sm text-gris">{timeAgo(m.created_at)}</span>
              </p>
              <form action={deleteMessage}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="evento_id" value={eventoId} />
                <button type="submit" aria-label="Borrar este mensaje" className="flex h-10 w-10 items-center justify-center rounded-full text-gris hover:bg-white">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
