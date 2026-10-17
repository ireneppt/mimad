// Foto por defecto de un plan sin foto propia: la de su tipo (una por interés,
// en public/fotos-por-tipo/). Se elige según la categoría del plan en los datos abiertos.
import { INTERESTS } from "./interests";

// Casos en los que la categoría encaja en varios intereses y conviene elegir uno
const OVERRIDES: Record<string, string> = {
  CapacitacionDigital: "tecnologia",
  EnLinea: "tecnologia",
  Integración: "idiomas",
  "Talleres contra la soledad": "talleres",
  DanzaBaile: "baile",
  Flamenco: "baile",
};

export function categoryPhoto(categoria: string | null | undefined): string {
  const id =
    (categoria && OVERRIDES[categoria]) ??
    (categoria && INTERESTS.find((i) => i.categories.includes(categoria))?.id) ??
    "cultura"; // lo que no encaja en ningún interés: los tejados de Madrid
  return `/fotos-por-tipo/${id}.webp`;
}
