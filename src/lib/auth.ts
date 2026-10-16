// Login con móvil sin SMS: por dentro, cada móvil se convierte en un correo
// interno que nunca recibe mensajes. La persona solo ve "móvil" y "contraseña".
// Lo usan el login normal y el simplificado: no cambiar el formato.
//
// Estas funciones son para móviles de España (las usa la versión simplificada en
// el navegador). Para móviles de otros países: parseMobile() en lib/phone.ts
// (solo servidor). Para un móvil español, las dos dan el mismo correo interno.

const INTERNAL_EMAIL_DOMAIN = "movil.mimad.app";

// "612 34 56 78", "+34612345678", "0034 612..." → "612345678"
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0034")) digits = digits.slice(4);
  else if (digits.startsWith("34") && digits.length === 11) digits = digits.slice(2);
  return digits;
}

// Móvil español: 9 cifras que empiezan por 6 o 7
export function isValidMobile(input: string): boolean {
  return /^[67]\d{8}$/.test(normalizePhone(input));
}

// Móvil en formato internacional (+34612345678) → correo interno (34612345678@movil.mimad.app)
export function internalEmail(e164: string): string {
  return `${e164.replace(/\D/g, "")}@${INTERNAL_EMAIL_DOMAIN}`;
}

// Móvil español → correo interno
export function phoneToEmail(input: string): string {
  return internalEmail(`+34${normalizePhone(input)}`);
}

export const MIN_PASSWORD_LENGTH = 8;
