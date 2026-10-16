-- =====================================================================
-- Cuentas de entidad (organizaciones): publican planes, no participan.
--  1) Una entidad no puede apuntarse a planes, crear o aceptar vínculos de
--     acompañamiento ni recibir recomendaciones (lo bloquea la base de datos).
--  2) Planes de entidades: plazas opcionales, se pueden cancelar, y los
--     publicados aparecen en v_eventos junto a los datos abiertos.
--  3) Si una entidad cancela un plan o cambia la fecha o el lugar, se avisa
--     a las personas apuntadas.
-- =====================================================================

-- ¿Es una cuenta de entidad?
create function public.es_entidad(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.mm_perfiles where id = p_id and tipo = 'entidad');
$$;
revoke all on function public.es_entidad(uuid) from public, anon;
grant execute on function public.es_entidad(uuid) to authenticated, service_role;

-- 1) Las entidades no participan
drop policy "apuntarme" on public.mm_inscripciones;
create policy "apuntarme" on public.mm_inscripciones
  for insert to authenticated
  with check (usuario = (select auth.uid()) and not public.es_entidad((select auth.uid())));

drop policy "crear invitacion" on public.mm_vinculos;
create policy "crear invitacion" on public.mm_vinculos
  for insert to authenticated
  with check (familiar = (select auth.uid()) and persona is null and estado = 'pendiente'
              and not public.es_entidad((select auth.uid())));

drop policy "recomendar a mi persona" on public.mm_recomendaciones;
create policy "recomendar a mi persona" on public.mm_recomendaciones
  for insert to authenticated
  with check (de = (select auth.uid()) and public.es_familiar_de(para) and not public.es_entidad(para));

-- aceptar_vinculo: una entidad no puede aceptar invitaciones (se añade la comprobación)
create or replace function public.aceptar_vinculo(p_codigo text)
returns table (vinculo_id uuid, familiar_nombre text, error text)
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v public.mm_vinculos;
  fallos integer;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión';
  end if;
  if public.es_entidad(auth.uid()) then
    raise exception 'Las cuentas de entidad no pueden vincularse con personas.';
  end if;

  select count(*) into fallos from public.mm_intentos_codigo
  where usuario = auth.uid() and created_at > now() - interval '1 hour';
  if fallos >= 10 then
    raise exception 'Has probado demasiados códigos. Espera un rato y vuelve a intentarlo.';
  end if;

  select * into v from public.mm_vinculos
  where codigo = upper(trim(p_codigo)) and estado = 'pendiente' and expira_at > now();

  if not found then
    insert into public.mm_intentos_codigo (usuario) values (auth.uid());
    return query select null::uuid, null::text, 'El código no es válido o ha caducado. Pide uno nuevo.'::text;
    return;
  end if;
  if v.familiar = auth.uid() then
    raise exception 'Este código lo has creado tú. Pásaselo a la persona que quieres acompañar.';
  end if;
  if exists (select 1 from public.mm_vinculos
             where familiar = v.familiar and persona = auth.uid()) then
    raise exception 'Ya tenéis un vínculo.';
  end if;

  update public.mm_vinculos
  set persona = auth.uid(), estado = 'aceptado', aceptado_at = now()
  where id = v.id;

  delete from public.mm_intentos_codigo where usuario = auth.uid();

  return query
    select v.id, p.nombre, null::text from public.mm_perfiles p where p.id = v.familiar;
end;
$fn$;

-- 2) Planes de entidades: plazas y cancelación
alter table public.mm_eventos
  add column plazas integer check (plazas is null or plazas between 1 and 10000),
  add column cancelado_at timestamptz;

alter table public.mm_eventos drop constraint mm_eventos_estado_check;
alter table public.mm_eventos
  add constraint mm_eventos_estado_check check (estado in ('pendiente', 'publicado', 'rechazado', 'cancelado'));

-- El estado lo decide la base de datos; la entidad solo puede cancelar
create or replace function public.estado_evento_entidad()
returns trigger
language plpgsql set search_path = ''
as $fn$
begin
  if current_user = 'authenticated' then
    if tg_op = 'UPDATE' and old.estado in ('rechazado', 'cancelado') then
      new.estado := old.estado; -- un plan rechazado o cancelado no vuelve a publicarse solo
    elsif tg_op = 'UPDATE' and new.estado = 'cancelado' then
      new.cancelado_at := now();
    elsif exists (select 1 from public.mm_entidades e where e.id = new.entidad_id and e.verificada) then
      new.estado := 'publicado';
    else
      new.estado := 'pendiente';
    end if;
  end if;
  return new;
end;
$fn$;

-- Fuente para la etiqueta "Fuente: …" de los planes de entidades
insert into public.da_fuentes (id, nombre, organismo, url_ficha, url_descarga, licencia)
values ('entidad', 'Planes publicados por entidades en MiMad', 'Entidades verificadas con el Registro de centros de atención social',
        'https://datos.comunidad.madrid/catalogo/dataset/b8cdb7f7-3185-4938-800a-fefda72333f5', 'https://mimad.vercel.app', 'Contenido de cada entidad')
on conflict (id) do nothing;

-- v_eventos con los planes de entidades (y una columna nueva al final: organizacion)
create or replace view public.v_eventos as
-- Agenda del Ayuntamiento: solo lo que no ha terminado
select
  'agenda_madrid:' || a.id                    as id,
  a.fuente,
  a.titulo,
  a.descripcion,
  a.categoria,
  a.fecha_inicio,
  a.fecha_fin,
  a.hora                                      as horario,
  (a.recurrencia_dias is not null)            as recurrente,
  a.lugar,
  a.direccion,
  initcap(a.localidad)                        as municipio,
  a.distrito,
  a.lat,
  a.lon,
  a.url,
  a.gratuito,
  a.precio,
  a.accesibilidad,
  a.publico,
  'es'::text                                  as idioma,
  a.organizacion                              as organizacion
from public.da_agenda_madrid a
where coalesce(a.fecha_fin, a.fecha_inicio) >= (now() at time zone 'Europe/Madrid')::date

union all

-- Juntos contra la soledad: talleres semanales, sin fecha concreta
select
  'juntos_contra_soledad:' || j.id,
  j.fuente,
  coalesce(j.tipo_taller, 'Taller contra la soledad') || ' en ' || j.centro,
  j.descripcion,
  'Talleres contra la soledad',
  null,
  null,
  'Cada ' || lower(j.dia) || ', ' || j.horario,
  true,
  j.centro,
  j.direccion,
  'Madrid',
  j.distrito,
  j.lat,
  j.lon,
  j.mas_informacion,
  true,
  null,
  null,
  'Mayores',
  'es',
  'Ayuntamiento de Madrid · Dirección General de Mayores'
from public.da_juntos_contra_soledad j

union all

-- CEPI: solo mes y centro. Se muestra como "Actividad de <mes> en el CEPI X"
select
  'cepi:' || c.id,
  c.fuente,
  c.denominacion,
  'Actividad de ' ||
    (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
           'septiembre','octubre','noviembre','diciembre'])[c.mes] ||
    ' en el ' || p.nombre || '. Ámbito: ' || initcap(lower(c.ambito)) || '.',
  'Integración',
  make_date(c.anio, c.mes, 1)::timestamp,
  (make_date(c.anio, c.mes, 1) + interval '1 month' - interval '1 minute')::timestamp,
  null,
  false,
  p.nombre,
  p.direccion,
  p.municipio,
  null,
  p.lat,
  p.lon,
  p.url,
  null,
  null,
  null,
  'Personas migrantes',
  c.idioma,
  p.nombre
from public.da_cepi_actividades c
join public.mm_cepi_centros p on p.centro = c.centro
where make_date(c.anio, c.mes, 1) + interval '1 month' > (now() at time zone 'Europe/Madrid')::date

union all

-- Planes publicados por entidades en MiMad (solo los publicados y que no han terminado)
select
  'entidad:' || ev.id,
  'entidad',
  ev.titulo,
  ev.descripcion,
  ev.categoria,
  ev.fecha_inicio,
  coalesce(ev.fecha_fin, ev.fecha_inicio),
  to_char(ev.fecha_inicio, 'HH24:MI'),
  false,
  ent.nombre,
  ev.direccion,
  ev.municipio,
  null,
  ev.lat,
  ev.lon,
  null,
  ev.gratuito,
  ev.precio,
  case when ev.accesible then '1' else null end,
  ev.publico,
  'es',
  ent.nombre || case when ent.verificada then ' · Entidad verificada' else '' end
from public.mm_eventos ev
join public.mm_entidades ent on ent.id = ev.entidad_id
where ev.estado = 'publicado'
  and coalesce(ev.fecha_fin, ev.fecha_inicio) >= (now() at time zone 'Europe/Madrid')::date;

grant select on public.v_eventos to anon, authenticated, service_role;

-- 3) Avisos a las personas apuntadas si el plan se cancela o cambia de fecha o lugar
create function public.notificar_cambio_evento()
returns trigger
language plpgsql security definer set search_path = ''
as $fn$
declare
  aviso text;
  detalle text;
begin
  if new.estado = 'cancelado' and old.estado is distinct from 'cancelado' then
    aviso := 'Se ha cancelado «' || new.titulo || '»';
    detalle := 'Lo sentimos: la entidad que lo organizaba lo ha cancelado.';
  elsif new.estado = 'publicado' and (new.fecha_inicio is distinct from old.fecha_inicio or new.direccion is distinct from old.direccion) then
    aviso := 'Ha cambiado «' || new.titulo || '»';
    detalle := case
      when new.fecha_inicio is distinct from old.fecha_inicio and new.direccion is distinct from old.direccion then 'Nueva fecha y nuevo lugar'
      when new.fecha_inicio is distinct from old.fecha_inicio then 'Nueva fecha: ' || to_char(new.fecha_inicio, 'DD/MM HH24:MI')
      else 'Nuevo lugar: ' || coalesce(new.direccion, '')
    end;
  else
    return new;
  end if;

  insert into public.mm_notificaciones (usuario, tipo, titulo, texto, evento_id)
  select i.usuario, 'plan_cambio', aviso, detalle, 'entidad:' || new.id
  from public.mm_inscripciones i
  where i.evento_id = 'entidad:' || new.id;
  return new;
end;
$fn$;

create trigger mm_notificar_cambio_evento
  after update on public.mm_eventos
  for each row execute function public.notificar_cambio_evento();

-- =====================================================================
-- 4) Mensajes de la entidad a las personas apuntadas (canal moderado:
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
