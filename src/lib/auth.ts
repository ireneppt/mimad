// Login con móvil sin SMS: por dentro, cada móvil se convierte en un correo
// interno que nunca recibe mensajes. La persona solo ve "móvil" y "contraseña".
// Lo usan el login normal y el simplificado: no cambiar el formato.

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

export function phoneToEmail(input: string): string {
  return `34${normalizePhone(input)}@${INTERNAL_EMAIL_DOMAIN}`;
}

export const MIN_PASSWORD_LENGTH = 8;
