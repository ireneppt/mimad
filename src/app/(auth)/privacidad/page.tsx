import Link from "next/link";

export const metadata = { title: "Privacidad · MiMad" };

export default function PrivacyPage() {
  return (
    <main className="flex flex-col gap-5 px-5 py-10 text-lg leading-relaxed">
      <Link href="/registro" className="text-coral-texto">← Volver</Link>
      <h1 className="text-3xl font-bold">Política de privacidad</h1>
      <p className="rounded-2xl bg-crema p-4 text-base">
        MiMad es un <strong>prototipo</strong> para el datathon DataMad 2026. No uses datos reales que no quieras compartir.
      </p>
      <h2 className="text-xl font-semibold">Qué guardamos</h2>
      <p>Tu nombre, tu móvil (para iniciar sesión), tu municipio o barrio, tus intereses y los planes a los que te apuntas.</p>
      <h2 className="text-xl font-semibold">Quién lo ve</h2>
      <p>
        Solo tú. Si aceptas un vínculo de acompañamiento con un familiar, esa persona puede ver tu perfil y tu agenda para
        recomendarte planes. Puedes deshacer el vínculo cuando quieras.
      </p>
      <h2 className="text-xl font-semibold">Dónde se guarda</h2>
      <p>En una base de datos de Supabase alojada en la Unión Europea.</p>
      <h2 className="text-xl font-semibold">Datos abiertos</h2>
      <p>Las actividades y los lugares que ves vienen de los portales de datos abiertos de la Comunidad de Madrid y del Ayuntamiento de Madrid.</p>
    </main>
  );
}
