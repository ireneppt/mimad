// Idiomas a los que se pueden traducir los planes (personas extranjeras, versión por defecto).
// El idioma elegido en el selector de la cabecera se guarda en una cookie de este móvil.
// flag: bandera en public/banderas/ (flag-icons, licencia MIT). Un idioma no es un país:
// se usa el país de donde viene más gente a Madrid con ese idioma (árabe → Marruecos).
export const TRANSLATE_LANGUAGES = [
  { id: "en", short: "EN", label: "English", name: "inglés", flag: "gb" },
  { id: "fr", short: "FR", label: "Français", name: "francés", flag: "fr" },
  { id: "ar", short: "AR", label: "العربية", name: "árabe", flag: "ma", rtl: true },
  { id: "ro", short: "RO", label: "Română", name: "rumano", flag: "ro" },
  { id: "zh", short: "ZH", label: "中文", name: "chino simplificado", flag: "cn" },
  { id: "uk", short: "UK", label: "Українська", name: "ucraniano", flag: "ua" },
  { id: "pt", short: "PT", label: "Português", name: "portugués", flag: "pt" },
  { id: "de", short: "DE", label: "Deutsch", name: "alemán", flag: "de" },
] as const;

export type TranslateLanguage = (typeof TRANSLATE_LANGUAGES)[number]["id"];

export const parseLanguage = (s: unknown): TranslateLanguage | null =>
  TRANSLATE_LANGUAGES.find((l) => l.id === s)?.id ?? null;

export const LANG_COOKIE = "mm_idioma";
