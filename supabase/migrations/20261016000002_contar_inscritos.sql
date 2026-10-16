-- =====================================================================
-- Cuántas personas de MiMad se han apuntado a un evento.
-- Cada persona solo puede ver SUS inscripciones (RLS), así que para contar
-- las de todos hace falta esta función: devuelve solo el número, nunca quién.
-- =====================================================================

create function public.contar_inscritos(p_evento text)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.mm_inscripciones where evento_id = p_evento;
$$;

revoke all on function public.contar_inscritos(text) from public;
grant execute on function public.contar_inscritos(text) to anon, authenticated, service_role;
