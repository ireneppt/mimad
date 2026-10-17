// Plan de la agenda ya preparado en el servidor para la pantalla
export type AgendaPlan = {
  id: string;
  title: string;
  category: string | null; // categoría original (icono)
  label: string; // categoría legible ("Talleres")
  date: string; // próxima fecha "2026-10-22"
  time: string | null; // "17:30"
  weekly: boolean; // taller que se repite cada semana
  weekday: number | null; // si es semanal, día de la semana (0 = domingo)
  place: string | null;
  lat: number | null;
  lon: number | null;
  overlaps: boolean; // coincide con otro plan de la agenda
  image: string | null;
};
