// Nombre legible e icono de cada categoría de v_eventos
import {
  Bike, BookOpen, Drama, Film, Footprints, Globe, Hammer, HeartHandshake, Landmark,
  Laptop, Music, PartyPopper, Sparkles, Trees, Users, type LucideIcon,
} from "lucide-react";

type CategoryInfo = { label: string; icon: LucideIcon };

const CATEGORIES: Record<string, CategoryInfo> = {
  "Talleres contra la soledad": { label: "Contra la soledad", icon: HeartHandshake },
  "Integración": { label: "Integración", icon: Globe },
  CursosTalleres: { label: "Talleres", icon: Hammer },
  CapacitacionDigital: { label: "Digital", icon: Laptop },
  Musica: { label: "Música", icon: Music },
  Clasica: { label: "Música clásica", icon: Music },
  Flamenco: { label: "Flamenco", icon: Music },
  CoroGospel: { label: "Coros", icon: Music },
  JazzSoulFunkySwingReagge: { label: "Jazz y soul", icon: Music },
  DanzaBaile: { label: "Baile", icon: Footprints },
  TeatroPerformance: { label: "Teatro", icon: Drama },
  ComediaMonologo: { label: "Humor", icon: Drama },
  CircoMagia: { label: "Circo y magia", icon: Sparkles },
  CuentacuentosTiteresMarionetas: { label: "Cuentacuentos", icon: BookOpen },
  CineActividadesAudiovisuales: { label: "Cine", icon: Film },
  CineFiccion: { label: "Cine", icon: Film },
  Exposiciones: { label: "Exposiciones", icon: Landmark },
  ConferenciasColoquios: { label: "Charlas", icon: Users },
  RecitalesPresentacionesActosLiterarios: { label: "Literatura", icon: BookOpen },
  ClubesLectura: { label: "Club de lectura", icon: BookOpen },
  ExcursionesItinerariosVisitas: { label: "Visitas y rutas", icon: Footprints },
  ItinerariosOtrasActividadesAmbientales: { label: "Naturaleza", icon: Trees },
  ActividadesDeportivas: { label: "Deporte", icon: Bike },
  CarrerasMaratones: { label: "Carreras", icon: Bike },
  Ciclismo: { label: "Ciclismo", icon: Bike },
  Fiestas: { label: "Fiestas", icon: PartyPopper },
  ProgramacionDestacadaAgendaCultura: { label: "Destacado", icon: Sparkles },
  "1ciudad21distritos": { label: "En los distritos", icon: Landmark },
};

export function categoryInfo(categoria: string | null): CategoryInfo {
  return (categoria && CATEGORIES[categoria]) || { label: "Actividad", icon: Sparkles };
}

// Lugares de v_lugares (mapa): icono propio para distinguirlos de los planes
const PLACE_ICONS: Record<string, LucideIcon> = {
  "Hogar de mayores": HeartHandshake,
  "Centro municipal de mayores": Users,
  "Centro de día": Landmark,
  Talleres: Hammer,
  "Centro de integración (CEPI)": Globe,
};

export function placeIcon(categoria: string): LucideIcon {
  return PLACE_ICONS[categoria] ?? Landmark;
}
