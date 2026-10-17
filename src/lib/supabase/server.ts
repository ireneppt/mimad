import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para componentes de servidor y rutas de API.
// Lee la sesión del usuario desde las cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: no puede escribir cookies.
            // No pasa nada si el middleware refresca la sesión.
          }
        },
      },
    }
  );
}

// Quién ha entrado. Mientras se pinta una página (layout, página y componentes) se pregunta
// a Supabase una sola vez y se reutiliza: antes se hacía hasta 3 veces seguidas.
// (En las acciones de formularios no se guarda: allí se usa supabase.auth.getUser().)
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
