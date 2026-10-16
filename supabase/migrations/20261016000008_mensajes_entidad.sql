-- =====================================================================
-- Mensajes de la entidad a las personas apuntadas (canal moderado:
--    solo escribe la entidad dueña del plan; solo leen las personas apuntadas).
--    Cada mensaje llega también como aviso a la campana.
-- =====================================================================
create table public.mm_mensajes_evento (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.mm_eventos(id) on delete cascade,
  texto       text not null check (char_length(texto) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index on public.mm_mensajes_evento (evento_id, created_at);

-- ¿El plan es de la entidad de la persona con sesión?
create function public.es_mi_evento(p_evento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mm_eventos ev join public.mm_entidades e on e.id = ev.entidad_id
    where ev.id = p_evento and e.usuario = auth.uid()
  );
$$;
revoke all on function public.es_mi_evento(uuid) from public, anon;
grant execute on function public.es_mi_evento(uuid) to authenticated;

-- ¿La persona con sesión está apuntada a ese plan?
create function public.estoy_apuntada(p_evento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mm_inscripciones i
    where i.usuario = auth.uid() and i.evento_id = 'entidad:' || p_evento
  );
$$;
revoke all on function public.estoy_apuntada(uuid) from public, anon;
grant execute on function public.estoy_apuntada(uuid) to authenticated;

alter table public.mm_mensajes_evento enable row level security;
grant select, insert, delete on public.mm_mensajes_evento to authenticated;
grant select, insert, update, delete on public.mm_mensajes_evento to service_role;

create policy "leer mensajes de mi plan o de un plan al que voy" on public.mm_mensajes_evento
  for select to authenticated
  using (public.es_mi_evento(evento_id) or public.estoy_apuntada(evento_id));
create policy "escribir en mis planes" on public.mm_mensajes_evento
  for insert to authenticated
  with check (public.es_mi_evento(evento_id));
create policy "borrar mensajes de mis planes" on public.mm_mensajes_evento
  for delete to authenticated
  using (public.es_mi_evento(evento_id));

-- Aviso a cada persona apuntada
create function public.notificar_mensaje_evento()
returns trigger
language plpgsql security definer set search_path = ''
as $fn$
declare
  t text;
  quien text;
begin
  select ev.titulo, e.nombre into t, quien
  from public.mm_eventos ev join public.mm_entidades e on e.id = ev.entidad_id
  where ev.id = new.evento_id;

  insert into public.mm_notificaciones (usuario, tipo, titulo, texto, evento_id)
  select i.usuario, 'mensaje', 'Mensaje de ' || quien || ' sobre «' || t || '»',
         left(new.texto, 200) || case when char_length(new.texto) > 200 then '…' else '' end,
         'entidad:' || new.evento_id
  from public.mm_inscripciones i
  where i.evento_id = 'entidad:' || new.evento_id;
  return new;
end;
$fn$;

create trigger mm_notificar_mensaje_evento
  after insert on public.mm_mensajes_evento
  for each row execute function public.notificar_mensaje_evento();
