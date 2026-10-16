"use server";

// Guardar o corregir los datos de la entidad. Al cambiar el NIF, la base de datos lo
// vuelve a verificar contra el Registro (trigger mm_verificar_entidad).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nifError, normalizeNif } from "@/lib/nif";
import { geocode } from "@/lib/geocode";
import { ENTITY_AUDIENCES, ENTITY_CATEGORIES } from "@/lib/entityEvents";

export type EntityState = { ok?: string; error?: string };

export async function saveEntity(_prev: EntityState, form: FormData): Promise<EntityState> {
  const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const nif = normalizeNif(String(form.get("nif") ?? ""));
  if (nombre.length < 2 || nombre.length > 120 || /[<>]/.test(nombre)) return { error: "Escribe el nombre de la entidad (entre 2 y 120 caracteres)." };
  const err = nifError(nif);
  if (err) return { error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/entidad");

  const { data: existing } = await supabase.from("mm_entidades").select("id").eq("usuario", user.id).maybeSingle();
  const { data, error } = existing
    ? await supabase.from("mm_entidades").update({ nombre, nif }).eq("id", existing.id).select("verificada").single()
    : await supabase.from("mm_entidades").insert({ nombre, nif }).select("verificada").single();
  if (error) return { error: "No se ha podido guardar. Prueba otra vez." };

  revalidatePath("/entidad");
  return { ok: data.verificada ? "Guardado. Tu entidad está verificada." : "Guardado. Este NIF no está en el Registro: tus planes quedarán pendientes de revisión." };
}

// ---------------------------------------------------------------------
// Planes de la entidad: publicar, editar y cancelar
// ---------------------------------------------------------------------
export type EventFormState = { error?: string; ok?: string; values?: Record<string, string> };

async function myEntity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/entidad");
  const { data: entidad } = await supabase.from("mm_entidades").select("id").eq("usuario", user.id).maybeSingle();
  return { supabase, entidad };
}

// Lee y comprueba el formulario; devuelve los datos para mm_eventos o un error
async function readEventForm(form: FormData): Promise<{ data?: Record<string, unknown>; error?: string; values: Record<string, string> }> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const values = Object.fromEntries(
    ["titulo", "descripcion", "categoria", "fecha", "hora_inicio", "hora_fin", "direccion", "municipio", "precio", "publico", "plazas", "gratuito", "accesible"].map((k) => [k, get(k)])
  );
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 10);

  if (values.titulo.length < 3 || values.titulo.length > 150) return { error: "El título necesita entre 3 y 150 caracteres.", values };
  if (values.descripcion.length > 3000) return { error: "La descripción puede tener como máximo 3.000 caracteres.", values };
  if (!ENTITY_CATEGORIES.some((c) => c.value === values.categoria)) return { error: "Elige qué tipo de plan es.", values };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fecha) || values.fecha < today) return { error: "Elige una fecha de hoy en adelante.", values };
  if (!/^\d{2}:\d{2}$/.test(values.hora_inicio)) return { error: "Elige la hora de inicio.", values };
  if (values.hora_fin && (!/^\d{2}:\d{2}$/.test(values.hora_fin) || values.hora_fin <= values.hora_inicio)) return { error: "La hora de fin tiene que ser después de la de inicio.", values };
  if (values.direccion.length < 5 || values.direccion.length > 200) return { error: "Escribe la dirección (calle y número).", values };
  const gratuito = values.gratuito !== "no";
  if (!gratuito && (!values.precio || values.precio.length > 100)) return { error: "Escribe el precio (por ejemplo, «3 €»).", values };
  if (values.publico && !ENTITY_AUDIENCES.some((a) => a.value === values.publico)) return { error: "Elige para quién es.", values };
  const plazas = values.plazas ? Number(values.plazas) : null;
  if (plazas !== null && (!Number.isInteger(plazas) || plazas < 1 || plazas > 10000)) return { error: "Las plazas tienen que ser un número entre 1 y 10.000.", values };

  // Dirección → punto en el mapa (para el mapa, las distancias y "Cómo llegar")
  const point = await geocode(values.direccion, values.municipio);
  if (!point) return { error: "No encontramos esa dirección en la Comunidad de Madrid. Revisa la calle, el número y el municipio.", values };

  return {
    values,
    data: {
      titulo: values.titulo,
      descripcion: values.descripcion || null,
      categoria: values.categoria,
      fecha_inicio: `${values.fecha}T${values.hora_inicio}:00`,
      fecha_fin: values.hora_fin ? `${values.fecha}T${values.hora_fin}:00` : null,
      direccion: values.direccion,
      municipio: values.municipio || "Madrid",
      lat: point.lat,
      lon: point.lon,
      gratuito,
      precio: gratuito ? null : values.precio,
      publico: values.publico || null,
      accesible: values.accesible === "on",
      plazas,
    },
  };
}

export async function createEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const { supabase, entidad } = await myEntity();
  if (!entidad) return { error: "Primero completa los datos de tu entidad en el panel." };
  const { data, error, values } = await readEventForm(form);
  if (error || !data) return { error, values };
  // El estado (publicado / pendiente) lo decide la base de datos según la verificación
  const { data: created, error: e } = await supabase.from("mm_eventos").insert({ ...data, entidad_id: entidad.id }).select("id").single();
  if (e) return { error: "No se ha podido publicar. Prueba otra vez.", values };
  revalidatePath("/", "layout");
  redirect(`/entidad/eventos/${created.id}?nuevo=1`);
}

export async function updateEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const id = String(form.get("id") ?? "");
  const { supabase, entidad } = await myEntity();
  if (!entidad) return { error: "No encontramos tu entidad." };
  const { data, error, values } = await readEventForm(form);
  if (error || !data) return { error, values };
  const { error: e } = await supabase.from("mm_eventos").update(data).eq("id", id).eq("entidad_id", entidad.id);
  if (e) return { error: "No se ha podido guardar. Prueba otra vez.", values };
  revalidatePath("/", "layout");
  return { ok: "Cambios guardados. Si has cambiado la fecha o el lugar, avisamos a las personas apuntadas.", values };
}

export async function cancelEvent(form: FormData) {
  const id = String(form.get("id") ?? "");
  const { supabase, entidad } = await myEntity();
  if (!entidad) return;
  await supabase.from("mm_eventos").update({ estado: "cancelado" }).eq("id", id).eq("entidad_id", entidad.id);
  revalidatePath("/", "layout");
  redirect(`/entidad/eventos/${id}?cancelado=1`);
}

// ---------------------------------------------------------------------
// Mensajes a las personas apuntadas (solo escribe la entidad)
// ---------------------------------------------------------------------
export type MessageState = { error?: string; ok?: string; sent?: number };

export async function sendMessage(prev: MessageState, form: FormData): Promise<MessageState> {
  const id = String(form.get("evento_id") ?? "");
  const texto = String(form.get("texto") ?? "").trim().replace(/\n{3,}/g, "\n\n");
  if (texto.length < 1) return { error: "Escribe el mensaje." };
  if (texto.length > 1000) return { error: "El mensaje puede tener como máximo 1.000 caracteres." };
  const { supabase, entidad } = await myEntity();
  if (!entidad) return { error: "No encontramos tu entidad." };
  // La base de datos solo deja escribir en planes de tu entidad (y avisa a las personas apuntadas)
  const { error } = await supabase.from("mm_mensajes_evento").insert({ evento_id: id, texto });
  if (error) return { error: "No se ha podido enviar. Prueba otra vez." };
  revalidatePath(`/entidad/eventos/${id}`);
  return { ok: "Mensaje enviado a las personas apuntadas.", sent: (prev.sent ?? 0) + 1 };
}

export async function deleteMessage(form: FormData) {
  const id = String(form.get("id") ?? "");
  const eventoId = String(form.get("evento_id") ?? "");
  const { supabase } = await myEntity();
  await supabase.from("mm_mensajes_evento").delete().eq("id", id);
  revalidatePath(`/entidad/eventos/${eventoId}`);
}
