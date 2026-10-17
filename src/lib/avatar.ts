// Fotos de perfil: se guardan en Supabase Storage (bucket "avatares"), en la carpeta
// de cada persona. Solo servidor: lo usan las acciones de registro y perfil.
import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatares";
const MAX_BYTES = 1024 * 1024; // 1 MB (la foto ya llega reducida a ~40 KB)
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export function avatarError(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!TYPES[file.type]) return "La foto tiene que ser una imagen (JPG, PNG o WebP).";
  if (file.size > MAX_BYTES) return "La foto es demasiado grande. Prueba con otra.";
  return null;
}

// Sube la foto nueva, la guarda en el perfil y borra las anteriores. Devuelve un error o null.
export async function saveAvatar(db: SupabaseClient, userId: string, file: File): Promise<string | null> {
  const err = avatarError(file);
  if (err) return err;
  const path = `${userId}/${crypto.randomUUID()}.${TYPES[file.type]}`; // nombre aleatorio: no se puede adivinar
  const { error } = await db.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return "No se ha podido subir la foto. Prueba otra vez.";

  const url = db.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await db.from("mm_perfiles").update({ foto_url: url }).eq("id", userId);
  if (e2) return "No se ha podido guardar la foto. Prueba otra vez.";
  await removeAvatars(db, userId, path);
  return null;
}

// Borra las fotos de la persona (todas, o todas menos "keep")
export async function removeAvatars(db: SupabaseClient, userId: string, keep?: string) {
  const { data } = await db.storage.from(AVATAR_BUCKET).list(userId);
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await db.storage.from(AVATAR_BUCKET).remove(old);
}

// ---------------------------------------------------------------------
// Fotos de los planes de entidades (bucket "fotos-planes", carpeta de cada cuenta)
// ---------------------------------------------------------------------
export const PLAN_PHOTO_BUCKET = "fotos-planes";
const PLAN_MAX_BYTES = 2 * 1024 * 1024; // ya llega reducida a 1200×675 (~120 KB)

export function planPhotoError(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!TYPES[file.type]) return "La foto tiene que ser una imagen (JPG, PNG o WebP).";
  if (file.size > PLAN_MAX_BYTES) return "La foto es demasiado grande. Prueba con otra.";
  return null;
}

// Sube la foto y devuelve su dirección pública (o un error)
export async function uploadPlanPhoto(db: SupabaseClient, userId: string, file: File): Promise<{ url?: string; error?: string }> {
  const err = planPhotoError(file);
  if (err) return { error: err };
  const path = `${userId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error } = await db.storage.from(PLAN_PHOTO_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { error: "No se ha podido subir la foto. Prueba otra vez." };
  return { url: db.storage.from(PLAN_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
}

// Borra una foto de plan a partir de su dirección pública (al cambiarla o quitarla)
export async function removePlanPhoto(db: SupabaseClient, url: string | null | undefined) {
  const marker = `/${PLAN_PHOTO_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  if (url && i >= 0) await db.storage.from(PLAN_PHOTO_BUCKET).remove([url.slice(i + marker.length)]);
}
