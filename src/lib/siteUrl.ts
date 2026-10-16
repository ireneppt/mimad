// Dirección completa de la web (para enlaces que se comparten fuera, p. ej. por WhatsApp)
import { headers } from "next/headers";

export async function siteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
