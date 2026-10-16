-- =====================================================================
-- Fotos de perfil (opcionales) en Supabase Storage.
-- Cada persona guarda su foto en la carpeta con su id: avatares/<id>/<archivo>.webp
-- Solo puede subir, cambiar o borrar lo de SU carpeta. Las fotos se ven con un
-- enlace público con nombre aleatorio (no se pueden listar ni adivinar).
-- La app ya las reduce a 400×400 px antes de subirlas; aquí se limita a 1 MB.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "subir mi foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cambiar mi foto" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "borrar mi foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Para poder borrar las fotos antiguas al cambiarla (solo lista la carpeta propia)
create policy "ver mis fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Dirección pública de la foto en el perfil
alter table public.mm_perfiles
  add column foto_url text,
  add constraint mm_perfiles_foto_url check (foto_url is null or (char_length(foto_url) <= 500 and foto_url like 'https://%'));

grant update (foto_url) on public.mm_perfiles to authenticated;
