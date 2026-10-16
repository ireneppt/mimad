// Código postal → centro aproximado (solo en el servidor). Los datos salen de
// src/data/codigos-postales.json, generado con datos abiertos (npm run codigos-postales).
import data from "@/data/codigos-postales.json";
import { isPostalCode } from "./location";

type PostalCode = { municipio: string; lat: number; lon: number };
const CODES: Record<string, PostalCode> = data.codigos;

export function postalCodeLocation(cp: string): PostalCode | null {
  const code = cp.trim();
  return isPostalCode(code) ? CODES[code] ?? null : null;
}
