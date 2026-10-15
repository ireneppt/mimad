// Pantalla provisional para las secciones que aún no están hechas
import { Construction } from "lucide-react";
import type { ReactNode } from "react";

export default function UnderConstruction({ title, task, children }: { title: string; task: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Construction size={48} className="text-coral-texto" aria-hidden="true" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-lg text-gris">Esta pantalla está en construcción ({task}).</p>
      {children}
    </main>
  );
}
