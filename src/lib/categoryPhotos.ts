// Foto por defecto de un plan sin foto propia: una de las de su tipo (varias por interés,
// en public/fotos-por-tipo/<interés>/1.webp, 2.webp…; fotos de Pexels). El tipo sale de la
// categoría del plan en los datos abiertos; cuál de ellas, del título, para que cada plan
// tenga siempre la misma foto (en la lista, el mapa y el detalle) y no se repitan todas.
import { INTERESTS } from "./interests";

// Cuántas fotos hay en cada carpeta
const PHOTO_COUNT: Record<string, number> = {
  baile: 6, cultura: 8, deporte: 7, gastronomia: 7, idiomas: 5, lectura: 6,
  musica: 7, naturaleza: 7, talleres: 9, teatro_cine: 7, tecnologia: 6, voluntariado: 5,
};

// Casos en los que la categoría encaja en varios intereses y conviene elegir uno
const OVERRIDES: Record<string, string> = {
  CapacitacionDigital: "tecnologia",
  EnLinea: "tecnologia",
  Integración: "idiomas",
  "Talleres contra la soledad": "talleres",
  DanzaBaile: "baile",
  Flamenco: "baile",
};

// Número sencillo a partir de un texto (siempre el mismo para el mismo texto)
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function photoFolder(categoria: string | null | undefined): string {
  return (
    (categoria && OVERRIDES[categoria]) ??
    (categoria && INTERESTS.find((i) => i.categories.includes(categoria))?.id) ??
    "cultura" // lo que no encaja en ningún interés: fotos de museos y de Madrid
  );
}

// skip: cuántas fotos saltar (para no repetir la de la tarjeta de al lado)
export function categoryPhoto(categoria: string | null | undefined, seed?: string | null, skip = 0): string {
  const id = photoFolder(categoria);
  const count = PHOTO_COUNT[id] ?? 1;
  const n = ((seed ? hash(seed.trim().toLowerCase()) : 0) + skip) % count + 1;
  return `/fotos-por-tipo/${id}/${n}.webp`;
}

// Fotos por defecto para una lista de planes: la de cada plan, salvo que sea igual que la
// de la tarjeta anterior siendo otro plan; entonces la siguiente de su tipo
export function listPhotos(items: { categoria: string | null; titulo: string; imagen?: string | null }[]): (string | undefined)[] {
  let prev: { photo?: string; title: string } = { title: "" };
  return items.map((e) => {
    if (e.imagen) {
      prev = { title: e.titulo };
      return undefined;
    }
    let photo = categoryPhoto(e.categoria, e.titulo);
    if (photo === prev.photo && e.titulo !== prev.title) photo = categoryPhoto(e.categoria, e.titulo, 1);
    prev = { photo, title: e.titulo };
    return photo;
  });
}
