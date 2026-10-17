// Desde dónde se calculan las distancias (solo en el servidor):
// 0) (solo si se pide con allowZone) la zona que ha elegido para ver planes ("Ver planes en otra zona"),
// 1) dónde estoy ahora o el código postal que ha escrito sin cuenta (cookie de este móvil),
// 2) su casa, 3) la Puerta del Sol.
import { cookies } from "next/headers";
import { HERE_COOKIE, parseHere, type Point } from "./location";
import { MADRID_CENTER, type Perfil } from "./profile";
import { parseZone, ZONE_COOKIE } from "./zones";

export type OriginKind = "aqui" | "cp" | "casa" | "centro";
// zone: nombre de la zona elegida (entonces kind es "aqui": se cuenta desde ese punto)
export type Origin = Point & { kind: OriginKind; cp?: string; zone?: string };

export async function getOrigin(perfil: Perfil | null, opts: { allowZone?: boolean } = {}): Promise<Origin> {
  const store = await cookies();
  if (opts.allowZone) {
    const zone = parseZone(store.get(ZONE_COOKIE)?.value);
    if (zone) return { lat: zone.lat, lon: zone.lon, kind: "aqui", zone: zone.name };
  }
  const here = parseHere(store.get(HERE_COOKIE)?.value);
  if (here?.cp) return { ...here.point, kind: "cp", cp: here.cp };
  if (here) return { ...here.point, kind: "aqui" };
  if (perfil?.lat != null && perfil?.lon != null) return { lat: perfil.lat, lon: perfil.lon, kind: "casa" };
  return { ...MADRID_CENTER, kind: "centro" };
}
