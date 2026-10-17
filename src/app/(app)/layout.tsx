import BottomNav from "@/components/BottomNav";
import { getAuthUser } from "@/lib/supabase/server";

// Pantallas de la versión por defecto: llevan la barra inferior
// (la de las cuentas de entidad es distinta: panel, sus planes, publicar, avisos y perfil)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const variant = user?.user_metadata?.tipo === "entidad" ? "entidad" : "persona";

  return (
    <>
      <div className="pb-28">{children}</div>
      <BottomNav variant={variant} />
    </>
  );
}
