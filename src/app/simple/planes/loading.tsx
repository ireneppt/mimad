import { LoaderCircle } from "lucide-react";

// Mientras se buscan los planes (al entrar o al cambiar Hoy / Mañana / Semana)
export default function Loading() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 text-center text-tinta" role="status">
      <LoaderCircle size={64} className="animate-spin text-coral-texto" aria-hidden="true" />
      <p className="text-2xl font-bold">Buscando planes cerca de tu casa…</p>
    </main>
  );
}
