// Bot de avisos de MiMad: tipos comunes a las tres partes.
//
//   mensajes.ts → QUÉ mensajes enviar (recordatorios, recomendaciones)
//   botones.ts  → QUÉ HACEN los botones (apuntarse, desapuntarse…)
//   canal.ts    → POR DÓNDE llegan (hoy: la pantalla simulada /whatsapp; mañana: WhatsApp)
//
// Los mensajes ya siguen las reglas de WhatsApp para que el cambio de canal sea fácil:
// texto con *negrita* al estilo WhatsApp, como mucho 3 botones de respuesta por mensaje
// y botones con un identificador corto ("accion:id del plan").

// Botón de respuesta rápida: al tocarlo, el canal devuelve su id a botones.ts
export type ReplyButton = { kind: "reply"; id: string; label: string };
// Botón que abre un enlace (en WhatsApp, "botón de llamada a la acción" con URL)
export type UrlButton = { kind: "url"; label: string; url: string };
export type BotButton = ReplyButton | UrlButton;

export type BotMessage = {
  id: string; // único en la conversación
  text: string; // con *negrita* al estilo WhatsApp y saltos de línea
  card?: { categoria: string | null; imagen: string | null }; // imagen de cabecera (recomendaciones)
  buttons: BotButton[];
};

// Acciones que puede pedir un botón de respuesta
export type BotAction = "voy" | "no_puedo" | "apuntarme" | "no_gracias";

export const buttonId = (action: BotAction, eventoId: string) => `${action}:${eventoId}`;

export function parseButtonId(id: string): { action: BotAction; eventoId: string } | null {
  const i = id.indexOf(":");
  const action = id.slice(0, i) as BotAction;
  const eventoId = id.slice(i + 1);
  if (i < 1 || !eventoId || eventoId.length > 200) return null;
  return ["voy", "no_puedo", "apuntarme", "no_gracias"].includes(action) ? { action, eventoId } : null;
}
