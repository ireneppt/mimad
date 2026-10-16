import { LoaderCircle } from "lucide-react";

// Pantalla de espera de la versión simplificada: así nunca parece que la app se ha quedado pillada
export default function LoadingScreen({ text }: { text: string }) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 text-center text-tinta" role="status">
      <LoaderCircle size={64} className="animate-spin text-coral-texto" aria-hidden="true" />
      <p className="text-2xl font-bold">{text}</p>
    </main>
  );
}
