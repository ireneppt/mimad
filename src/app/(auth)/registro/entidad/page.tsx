import Link from "next/link";
import { Building2 } from "lucide-react";

// Provisional: el registro de entidades con verificación del NIF es la tarea A9
export default function EntitySignupPlaceholder() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Building2 size={56} className="text-coral-texto" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Registro de entidades</h1>
      <p className="text-lg text-gris">Muy pronto podrás registrar tu organización y verificarla con su NIF.</p>
      <Link href="/registro" className="text-lg font-medium text-coral-texto">← Volver a crear cuenta</Link>
    </main>
  );
}
