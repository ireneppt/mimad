import BottomNav from "@/components/BottomNav";
import { getAuthUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n/server";

// Pantallas de la versión por defecto: llevan la barra inferior
// (la de las cuentas de entidad es distinta: panel, sus planes, publicar, avisos y perfil)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const variant = user?.user_metadata?.tipo === "entidad" ? "entidad" : "persona";
  // Idioma elegido (lectores de pantalla: pronuncian con la voz de ese idioma). Los datos que
  // siguen en español (títulos y descripciones sin traducir) llevan lang="es".
  const lang = variant === "persona" ? await getLang() : "es";

  return (
    <div lang={lang}>
      <div className="pb-28">{children}</div>
      <BottomNav variant={variant} lang={lang} />
    </div>
  );
}
