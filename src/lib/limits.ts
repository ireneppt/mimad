// Límites de los campos que escribe la gente. Se usan en los formularios (maxLength),
// en el servidor (validación) y coinciden con las restricciones de la base de datos
// (migración 20261016000001_limites.sql). Si cambias uno, cambia los tres.
export const LIMITS = {
  nameMin: 2,
  nameMax: 40,
  phoneMax: 20, // con espacios: "+34 612 34 56 78"
  municipioMax: 60,
  emailMax: 100,
  passwordMin: 8,
  passwordMax: 72, // máximo que admite Supabase Auth
} as const;

// Letras de cualquier idioma (con tildes, ñ, ç...), espacios, guion, apóstrofo y punto.
// Admite "María-José", "O'Brien", "Nguyễn", "Ana M.".
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .\-]*$/u;

export function nameError(name: string): string | null {
  const n = name.trim();
  if (n.length < LIMITS.nameMin) return "Escribe tu nombre (al menos 2 letras).";
  if (n.length > LIMITS.nameMax) return `El nombre puede tener como máximo ${LIMITS.nameMax} caracteres.`;
  if (!NAME_RE.test(n)) return "El nombre solo puede llevar letras, espacios, guiones y apóstrofos.";
  return null;
}

// Contraseña de la versión simplificada: solo la longitud (las reglas de símbolos
// y mayúsculas son una barrera para muchas personas mayores)
export function passwordError(password: string): string | null {
  if (password.length < LIMITS.passwordMin) return `La contraseña necesita al menos ${LIMITS.passwordMin} caracteres.`;
  if (password.length > LIMITS.passwordMax) return `La contraseña puede tener como máximo ${LIMITS.passwordMax} caracteres.`;
  return null;
}

// Requisitos de la contraseña segura (versión por defecto). Los usa la lista que se
// marca mientras se escribe y el servidor al crear la cuenta.
export const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: "largo", label: `Al menos ${LIMITS.passwordMin} caracteres`, test: (p) => p.length >= LIMITS.passwordMin },
  { id: "numero", label: "Un número", test: (p) => /\d/.test(p) },
  { id: "mayuscula", label: "Una letra mayúscula", test: (p) => /\p{Lu}/u.test(p) },
  { id: "minuscula", label: "Una letra minúscula", test: (p) => /\p{Ll}/u.test(p) },
  { id: "simbolo", label: "Un símbolo (por ejemplo ! ? @ # . -)", test: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
];

export function strongPasswordError(password: string): string | null {
  const basic = passwordError(password);
  if (basic) return basic;
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label.toLowerCase());
  return missing.length ? `A la contraseña le falta: ${missing.join(", ")}.` : null;
}

export function emailError(email: string): string | null {
  if (!email) return null; // es opcional
  if (email.length > LIMITS.emailMax) return `El correo puede tener como máximo ${LIMITS.emailMax} caracteres.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "El correo electrónico no parece correcto.";
  return null;
}
