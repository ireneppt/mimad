import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { distanceKm, getEvents, getSources } from "@/lib/data";
import { getCurrentProfile, homeLocation } from "@/lib/profile";
import EventCard from "@/components/EventCard";

// Inicio provisional (A2): comprueba que las piezas comunes funcionan con datos reales.
// La pantalla completa con buscador y filtros es la tarea A3.
export default async function HomePage() {
  const supabase = await createClient();
  const [perfil, fuentes] = await Promise.all([getCurrentProfile(supabase), getSources(supabase)]);
  const home = homeLocation(perfil);
  const eventos = await getEvents(supabase, { near: { ...home, km: 3 }, limit: 10 });

  return (
    <main className="flex flex-col gap-6 px-5 pt-8">
      <header className="flex items-center gap-4">
        <Image src="/icono.svg" alt="MiMad" width={56} height={56} />
        <div>
          <p className="text-base text-gris">{perfil ? `Hola, ${perfil.nombre}` : "Estás como invitado"}</p>
          <p className="text-2xl font-bold">{perfil?.municipio ?? "Madrid"}</p>
        </div>
      </header>

      {!perfil && (
        <p className="rounded-2xl bg-crema p-4 text-base">
          Para apuntarte a planes, <Link href="/registro" className="font-semibold text-coral-texto underline">crea tu cuenta</Link>.
        </p>
      )}

      <h1 className="text-3xl font-bold">Próximas quedadas</h1>
      <div className="flex flex-col gap-5">
        {eventos.map((e) => (
          <EventCard
            key={e.id}
            evento={e}
            fuente={fuentes[e.fuente]}
            distanceKm={e.lat != null && e.lon != null ? distanceKm(home, { lat: e.lat, lon: e.lon }) : undefined}
          />
        ))}
      </div>
    </main>
  );
}
