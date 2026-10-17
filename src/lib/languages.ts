// Idiomas a los que se pueden traducir los planes (personas extranjeras, versión por defecto).
// El idioma elegido en el selector de la cabecera se guarda en una cookie de este móvil.
export const TRANSLATE_LANGUAGES = [
  { id: "en", short: "EN", label: "English", name: "inglés" },
  { id: "fr", short: "FR", label: "Français", name: "francés" },
  { id: "ar", short: "AR", label: "العربية", name: "árabe", rtl: true },
  { id: "ro", short: "RO", label: "Română", name: "rumano" },
  { id: "zh", short: "ZH", label: "中文", name: "chino simplificado" },
  { id: "uk", short: "UK", label: "Українська", name: "ucraniano" },
  { id: "pt", short: "PT", label: "Português", name: "portugués" },
  { id: "de", short: "DE", label: "Deutsch", name: "alemán" },
] as const;

export type TranslateLanguage = (typeof TRANSLATE_LANGUAGES)[number]["id"];

export const parseLanguage = (s: unknown): TranslateLanguage | null =>
  TRANSLATE_LANGUAGES.find((l) => l.id === s)?.id ?? null;

export const LANG_COOKIE = "mm_idioma";
