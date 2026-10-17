import { NoticesProvider } from "@/components/simple/Notices";

// Todas las pantallas de la versión simplificada: con los avisos de la app (campana y aviso emergente)
export default function SimpleLayout({ children }: { children: React.ReactNode }) {
  return <NoticesProvider>{children}</NoticesProvider>;
}
