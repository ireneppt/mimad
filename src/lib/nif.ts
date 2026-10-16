// Comprobación del formato de un NIF español (sin consultar nada): CIF de entidades,
// DNI y NIE. Todos llevan un carácter de control que se calcula con las demás cifras,
// así se detecta al momento si alguien se equivoca al escribir una cifra.
// Después, la base de datos lo cruza con el Registro de centros de atención social.

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_CONTROL_LETTERS = "JABCDEFGHI";

export function normalizeNif(input: string): string {
  return input.toUpperCase().replace(/[\s.\-]/g, "");
}

function validDni(n: string): boolean {
  const m = n.match(/^(\d{8})([A-Z])$/);
  return !!m && DNI_LETTERS[Number(m[1]) % 23] === m[2];
}

function validNie(n: string): boolean {
  const m = n.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (!m) return false;
  const num = Number(`${"XYZ".indexOf(m[1])}${m[2]}`);
  return DNI_LETTERS[num % 23] === m[3];
}

// CIF: letra de tipo de entidad + 7 cifras + control (cifra o letra según el tipo)
function validCif(n: string): boolean {
  const m = n.match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!m) return false;
  const [, type, digits, control] = m;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) {
      const doubled = d * 2; // posiciones impares: se dobla y se suman sus cifras
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += d;
    }
  }
  const c = (10 - (sum % 10)) % 10;
  const asDigit = String(c);
  const asLetter = CIF_CONTROL_LETTERS[c];
  if ("PQRSWN".includes(type)) return control === asLetter; // control siempre letra
  if ("ABEH".includes(type)) return control === asDigit; // control siempre cifra
  return control === asDigit || control === asLetter;
}

export function nifError(input: string): string | null {
  const n = normalizeNif(input);
  if (!n) return "Escribe el NIF o CIF de la entidad.";
  if (n.length !== 9) return "El NIF o CIF tiene 9 caracteres (por ejemplo, G28727261).";
  if (validCif(n) || validDni(n) || validNie(n)) return null;
  return "Ese NIF o CIF no es correcto: revisa que no falte ni sobre ninguna cifra.";
}
