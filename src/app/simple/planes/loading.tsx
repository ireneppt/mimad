import LoadingScreen from "@/components/simple/LoadingScreen";

// Mientras se buscan los planes (al entrar o al cambiar Hoy / Mañana / Semana)
export default function Loading() {
  return <LoadingScreen text="Buscando planes cerca de tu casa…" />;
}
