import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import SimpleShell from "@/components/simple/SimpleShell";
import AcceptForm from "./AcceptForm";

export const metadata = { title: "Unirme a mi familiar · MiMad simplificada" };

// La persona acompañada escribe el código que le ha dado su familiar
export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ unida?: string }> }) {
  const { unida } = await searchParams;

  if (unida) {
    return (
      <SimpleShell
        defaultHref="/perfil"
        title={`¡Ya te acompaña ${unida}!`}
        intro={<p>{unida} podrá ver tus planes y recomendarte otros. Tú decides siempre si te apuntas.</p>}
        help={<ol><li>Toca <strong>Ir a mi cuenta</strong> para verlo.</li></ol>}
      >
        <div className="flex justify-center" aria-hidden="true">
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-green-50 text-green-700">
            <Check size={64} strokeWidth={3} />
          </span>
        </div>
        <Link href="/simple/perfil" className="bg-degradado-fuerte flex h-16 items-center justify-center rounded-2xl text-2xl font-bold text-white">
          Ir a mi cuenta
        </Link>
        <BackHome />
      </SimpleShell>
    );
  }

  return (
    <SimpleShell
      defaultHref="/perfil"
      title="Unirme a mi familiar"
      intro={
        <p>
          Escribe el <strong>código</strong> que te ha dado tu familiar. Son <strong>6 letras y números</strong>, por ejemplo ABC-DEF.
        </p>
      }
      help={
        <ol>
          <li>Pide a tu familiar el código. Se lo da la app MiMad, en «Personas que acompañas».</li>
          <li>Toca la caja blanca y escríbelo. No importan las mayúsculas ni el guion.</li>
          <li>Toca el botón naranja <strong>Unirme</strong>.</li>
        </ol>
      }
    >
      <AcceptForm />
      <p className="rounded-2xl bg-slate-100 p-5 text-xl leading-snug">
        Tu familiar podrá <strong>ver tus planes</strong> y <strong>recomendarte otros</strong>. No podrá apuntarte sin que tú quieras ni cambiar tus datos.
      </p>
      <BackHome />
    </SimpleShell>
  );
}

function BackHome() {
  return (
    <Link href="/simple/perfil" className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-slate-500 bg-white text-xl font-semibold">
      <ArrowLeft size={26} aria-hidden="true" />
      Volver a mi cuenta
    </Link>
  );
}
