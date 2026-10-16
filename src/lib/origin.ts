// Desde dónde se calculan las distancias (solo en el servidor):
// 1) dónde estoy ahora o el código postal que ha escrito sin cuenta (cookie de este móvil),
// 2) su casa, 3) la Puerta del Sol.
import { cookies } from "next/headers";
import { HERE_COOKIE, parseHere, type Point } from "./location";
import { MADRID_CENTER, type Perfil } from "./profile";

export type OriginKind = "aqui" | "cp" | "casa" | "centro";
export type Origin = Point & { kind: OriginKind; cp?: string };

export async function getOrigin(perfil: Perfil | null): Promise<Origin> {
  const here = parseHere((await cookies()).get(HERE_COOKIE)?.value);
  if (here?.cp) return { ...here.point, kind: "cp", cp: here.cp };
  if (here) return { ...here.point, kind: "aqui" };
  if (perfil?.lat != null && perfil?.lon != null) return { lat: perfil.lat, lon: perfil.lon, kind: "casa" };
  return { ...MADRID_CENTER, kind: "centro" };
}
