// Prefijos telefónicos para el selector de país del móvil.
// España primero; después, países con más residentes en la Comunidad de Madrid
// y el resto de Europa y Latinoamérica, por orden alfabético.
export type Country = { code: string; name: string; prefix: string };

export const DEFAULT_COUNTRY = "ES";

export const COUNTRIES: Country[] = [
  { code: "ES", name: "España", prefix: "34" },
  { code: "DE", name: "Alemania", prefix: "49" },
  { code: "AR", name: "Argentina", prefix: "54" },
  { code: "BD", name: "Bangladés", prefix: "880" },
  { code: "BO", name: "Bolivia", prefix: "591" },
  { code: "BR", name: "Brasil", prefix: "55" },
  { code: "BG", name: "Bulgaria", prefix: "359" },
  { code: "CL", name: "Chile", prefix: "56" },
  { code: "CN", name: "China", prefix: "86" },
  { code: "CO", name: "Colombia", prefix: "57" },
  { code: "CU", name: "Cuba", prefix: "53" },
  { code: "EC", name: "Ecuador", prefix: "593" },
  { code: "SV", name: "El Salvador", prefix: "503" },
  { code: "US", name: "Estados Unidos", prefix: "1" },
  { code: "PH", name: "Filipinas", prefix: "63" },
  { code: "FR", name: "Francia", prefix: "33" },
  { code: "GE", name: "Georgia", prefix: "995" },
  { code: "GQ", name: "Guinea Ecuatorial", prefix: "240" },
  { code: "HN", name: "Honduras", prefix: "504" },
  { code: "IN", name: "India", prefix: "91" },
  { code: "IT", name: "Italia", prefix: "39" },
  { code: "MA", name: "Marruecos", prefix: "212" },
  { code: "MX", name: "México", prefix: "52" },
  { code: "NI", name: "Nicaragua", prefix: "505" },
  { code: "NG", name: "Nigeria", prefix: "234" },
  { code: "PK", name: "Pakistán", prefix: "92" },
  { code: "PY", name: "Paraguay", prefix: "595" },
  { code: "PE", name: "Perú", prefix: "51" },
  { code: "PL", name: "Polonia", prefix: "48" },
  { code: "PT", name: "Portugal", prefix: "351" },
  { code: "GB", name: "Reino Unido", prefix: "44" },
  { code: "DO", name: "República Dominicana", prefix: "1" },
  { code: "RO", name: "Rumanía", prefix: "40" },
  { code: "RU", name: "Rusia", prefix: "7" },
  { code: "SN", name: "Senegal", prefix: "221" },
  { code: "UA", name: "Ucrania", prefix: "380" },
  { code: "UY", name: "Uruguay", prefix: "598" },
  { code: "VE", name: "Venezuela", prefix: "58" },
];

export function findCountry(code: string | null | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
