// Parte 3 del bot: POR DÓNDE llegan los mensajes.
//
// Hoy hay un solo canal: la pantalla simulada /whatsapp (src/app/whatsapp/). Muestra los
// mensajes de mensajes.ts y, cuando se toca un botón, llama a botones.ts y pinta la respuesta.
// No se envía nada fuera de la app.
//
// Cuando tengamos la cuenta de WhatsApp Business, se añadirá otro canal que cumpla esta
// misma forma, sin cambiar mensajes.ts ni botones.ts:
//   - deliver(): enviar cada BotMessage con la API de WhatsApp Cloud (mensaje interactivo
//     con botones de respuesta; los botones "url" como botón de enlace). El texto ya usa
//     *negrita* de WhatsApp. Ojo: WhatsApp no mezcla botones de respuesta y de enlace en
//     un mismo mensaje, así que "Cómo llegar" tendrá que ir en un mensaje aparte.
//   - Una ruta /api/whatsapp (webhook) que reciba el toque de un botón, busque a la persona
//     por su teléfono y llame a handleBotButton() con el id del botón; después, deliver().
//   - Una tarea programada (p. ej. cada 15 minutos) que llame a getBotMessages() para quien
//     tenga avisos_whatsapp = true y envíe con deliver() los mensajes cuya hora (at) ya ha
//     llegado: la confirmación al apuntarse y el recordatorio 24 h antes. Para no enviar dos
//     veces el mismo mensaje hará falta una tabla con los ids ya enviados (migración nueva).
//
// Mientras tanto, la pantalla simulada enseña los mensajes que ya han llegado y la
// notificación simulada (components/WhatsappNotice.tsx) avisa de los que no se han visto.
import type { BotMessage } from "./tipos";

export interface BotChannel {
  // Hace llegar los mensajes del bot a una persona
  deliver(to: { userId: string; telefono: string | null }, messages: BotMessage[]): Promise<void>;
}
