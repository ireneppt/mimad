"use server";

// Idioma elegido en la cabecera: se guarda un año en una cookie de este móvil.
// "es" (español) lo quita: es el idioma de los datos abiertos.
import { cookies } from "next/headers";
import { LANG_COOKIE, parseLanguage } from "./languages";

export async function setLanguage(lang: string) {
  const store = await cookies();
  const valid = parseLanguage(lang);
  if (valid) store.set(LANG_COOKIE, valid, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else store.delete(LANG_COOKIE);
}
