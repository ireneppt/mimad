import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const GUEST_COOKIE = "mm_invitado";

// Se ven sin cuenta (login, registro, ayuda...)
const PUBLIC_PATHS = ["/login", "/registro", "/simple/login", "/simple/registro", "/simple/ayuda", "/privacidad"];
// Un invitado puede curiosear, pero esto necesita cuenta
const ACCOUNT_ONLY_PATHS = [
  "/agenda", "/perfil", "/notificaciones", "/crear-evento", "/acompanamiento", "/whatsapp",
  "/simple/agenda", "/simple/perfil", "/simple/familia",
];

const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

// Refresca la sesión de Supabase en cada petición y protege las rutas
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Importante: getUser() valida la sesión con Supabase (no fiarse solo de la cookie)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (user || matches(path, PUBLIC_PATHS)) return response;

  const isGuest = request.cookies.get(GUEST_COOKIE)?.value === "1";
  if (isGuest && !matches(path, ACCOUNT_ONLY_PATHS)) return response;

  const url = request.nextUrl.clone();
  url.pathname = path.startsWith("/simple") ? "/simple/login" : "/login";
  url.search = path === "/" ? "" : `?next=${encodeURIComponent(path)}`;
  return NextResponse.redirect(url);
}
