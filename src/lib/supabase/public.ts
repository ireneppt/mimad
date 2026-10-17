import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase sin sesión (como una persona invitada), para datos abiertos que son
// iguales para todo el mundo y se pueden guardar en memoria un rato (unstable_cache).
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
