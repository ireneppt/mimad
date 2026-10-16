import { redirect } from "next/navigation";

// Dirección antigua: publicar un plan está ahora en el panel de la entidad
export default function CreateEventRedirect() {
  redirect("/entidad/nuevo");
}
