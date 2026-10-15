// Intereses que se eligen al crear la cuenta. Cada uno se relaciona con
// categorías de v_eventos para el filtro "Para ti".
import {
  Bike, BookOpen, Drama, Hammer, HandHeart, Languages, Laptop, Music,
  Palette, Trees, Utensils, Footprints, type LucideIcon,
} from "lucide-react";

export type Interest = {
  id: string;
  label: string;
  icon: LucideIcon;
  categories: string[]; // valores de v_eventos.categoria que encajan
};

export const INTERESTS: Interest[] = [
  { id: "cultura", label: "Cultura", icon: Palette, categories: ["Exposiciones", "ConferenciasColoquios", "ProgramacionDestacadaAgendaCultura", "Historia", "1ciudad21distritos"] },
  { id: "musica", label: "Música", icon: Music, categories: ["Musica", "Clasica", "JazzSoulFunkySwingReagge", "RockPop", "CoroGospel", "CantautorFolkCountry", "Flamenco", "Zarzuela", "LatinaEspanola", "FolcloreEtnica"] },
  { id: "teatro_cine", label: "Teatro y cine", icon: Drama, categories: ["TeatroPerformance", "CineActividadesAudiovisuales", "CineFiccion", "ComediaMonologo", "CircoMagia", "CuentacuentosTiteresMarionetas"] },
  { id: "talleres", label: "Talleres", icon: Hammer, categories: ["CursosTalleres", "Talleres contra la soledad", "CapacitacionDigital"] },
  { id: "deporte", label: "Deporte", icon: Bike, categories: ["ActividadesDeportivas", "Ciclismo", "CarrerasMaratones", "Golf", "Skateboarding"] },
  { id: "naturaleza", label: "Naturaleza", icon: Trees, categories: ["ItinerariosOtrasActividadesAmbientales", "ExcursionesItinerariosVisitas"] },
  { id: "lectura", label: "Lectura", icon: BookOpen, categories: ["ClubesLectura", "RecitalesPresentacionesActosLiterarios", "Literatura"] },
  { id: "gastronomia", label: "Gastronomía", icon: Utensils, categories: ["Ferias", "Fiestas"] },
  { id: "idiomas", label: "Idiomas", icon: Languages, categories: ["Idiomas", "Integración"] },
  { id: "tecnologia", label: "Tecnología", icon: Laptop, categories: ["CapacitacionDigital", "EnLinea"] },
  { id: "voluntariado", label: "Voluntariado", icon: HandHeart, categories: ["ComemoracionesHomenajes", "Integración"] },
  { id: "baile", label: "Baile", icon: Footprints, categories: ["DanzaBaile", "Flamenco"] },
];

export function categoriesForInterests(ids: string[]): string[] {
  return [...new Set(INTERESTS.filter((i) => ids.includes(i.id)).flatMap((i) => i.categories))];
}
