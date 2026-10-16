import "server-only";

// Validación de móviles de cualquier país con libphonenumber-js (la librería de
// Google/Android). Solo en el servidor: así no pesa en la app del móvil.
// Los metadatos "mobile" solo dan por válidos números de MÓVIL de ese país.
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/mobile";
import { findCountry } from "./countries";
import { internalEmail } from "./auth";

export type ParsedMobile = { e164: string; email: string };

// Devuelve el móvil en formato internacional (+34612345678) y su correo interno,
// o null si no es un móvil válido de ese país.
export function parseMobile(input: string, countryCode?: string | null): ParsedMobile | null {
  const country = findCountry(countryCode);
  const raw = input.trim();
  if (raw.length === 0 || raw.length > 25) return null;

  const phone = parsePhoneNumberFromString(raw, country.code as CountryCode);
  if (!phone || !phone.isValid()) return null;
  return { e164: phone.number, email: internalEmail(phone.number) };
}

export function invalidMobileMessage(countryCode?: string | null): string {
  const country = findCountry(countryCode);
  return country.code === "ES"
    ? "Escribe un móvil de 9 cifras que empiece por 6 o 7."
    : `Ese número no parece un móvil de ${country.name}. Revisa el número o el país.`;
}
