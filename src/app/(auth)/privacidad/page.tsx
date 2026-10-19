export const metadata = { title: "Privacidad · MiMad" };

// "Volver" lleva a la pantalla desde la que se abrió (?volver=/simple/perfil);
// sin ella, a crear cuenta. Solo direcciones de la propia app. Es un enlace normal (no <Link>):
// la versión simplificada tiene su propio diseño y así se carga entera.
const backHref = (volver?: string) => (volver?.startsWith("/") && !volver.startsWith("//") && !volver.includes("\\") ? volver : "/registro");

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams;
  return (
    <main className="flex flex-col gap-5 px-5 py-10 text-lg leading-relaxed">
      <a href={backHref(volver)} className="text-coral-texto">← Volver</a>
      <h1 className="text-3xl font-bold">Política de privacidad</h1>
      <p className="rounded-2xl bg-crema p-4 text-base">
        MiMad es un <strong>prototipo</strong> para el datathon DataMad 2026. No uses datos reales que no quieras compartir.
      </p>
      <h2 className="text-xl font-semibold">Qué guardamos</h2>
      <p>Tu nombre, tu móvil (para iniciar sesión), tu municipio o barrio, tus intereses y los planes a los que te apuntas.</p>
      <p>
        Si nos das tu código postal o la ubicación de tu casa, guardamos solo un punto aproximado (con un margen de unos 100
        metros) para calcular cuánto tardas en llegar a cada plan. Si usas «dónde estoy ahora», esa ubicación no se guarda en
        nuestra base de datos: se queda en tu móvil durante 3 horas.
      </p>
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
