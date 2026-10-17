// Idioma elegido (cookie del selector de la cabecera), para los componentes de servidor
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { LANG_COOKIE, parseLanguage } from "../languages";
import { makeT, type Lang } from "./index";

export const getLang = cache(async (): Promise<Lang> => parseLanguage((await cookies()).get(LANG_COOKIE)?.value) ?? "es");

export async function getT() {
  return makeT(await getLang());
}
