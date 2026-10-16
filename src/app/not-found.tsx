import Link from "next/link";
import { SearchX } from "lucide-react";

// Página que no existe (o que no tienes permiso para ver)
export default function NotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 text-center text-tinta">
      <SearchX size={56} className="text-coral-texto" aria-hidden="true" />
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="text-lg text-gris">Puede que el enlace esté mal o que ya no exista.</p>
      <Link href="/" className="bg-degradado flex h-14 items-center rounded-2xl px-8 text-lg font-semibold">
        Volver al inicio
      </Link>
    </main>
  );
}
