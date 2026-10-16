-- =====================================================================
-- Perfil: interruptor de avisos en la app y borrar la propia cuenta.
-- =====================================================================

alter table public.mm_perfiles
  add column avisos_app boolean not null default true;

grant update (avisos_app) on public.mm_perfiles to authenticated;

-- Borrar mi cuenta (derecho de supresión). Borra el usuario de Supabase Auth y, en
-- cascada, su perfil, inscripciones, vínculos, recomendaciones, notificaciones y entidad.
-- Solo puede borrar SU cuenta: usa auth.uid(), no recibe ningún id.
create function public.borrar_mi_cuenta()
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;
