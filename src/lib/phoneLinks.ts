// Enlaces y textos para un móvil guardado en el perfil. Sirve para los dos formatos
// que hay en la base de datos: el antiguo ("612345678", España) y el internacional
// ("+34612345678", desde que se admiten móviles de otros países).

// "+34612345678" (o null si no hay número)
export function toE164(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const digits = tel.replace(/\D/g, "");
  if (!digits) return null;
  if (tel.trim().startsWith("+")) return `+${digits}`;
  return digits.length === 9 ? `+34${digits}` : `+${digits}`;
}

export const telHref = (tel: string | null | undefined) => {
  const n = toE164(tel);
  return n ? `tel:${n}` : null;
};

// WhatsApp quiere el número sin "+" (wa.me/34612345678)
export const whatsappHref = (tel: string | null | undefined, text: string) => {
  const n = toE164(tel);
  return n ? `https://wa.me/${n.slice(1)}?text=${encodeURIComponent(text)}` : null;
};

// "612 345 678" para España; el formato internacional para otros países
export function displayPhone(tel: string | null | undefined): string {
  const n = toE164(tel);
  if (!n) return "—";
  if (n.startsWith("+34") && n.length === 12) return n.slice(3).replace(/(\d{3})(?=\d)/g, "$1 ");
  return n;
}
