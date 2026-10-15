import BottomNav from "@/components/BottomNav";

// Pantallas de la versión por defecto: llevan la barra inferior
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-28">{children}</div>
      <BottomNav />
    </>
  );
}
