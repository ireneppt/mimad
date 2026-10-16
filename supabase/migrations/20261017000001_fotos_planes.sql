-- =====================================================================
-- Fotos de los planes
--  1) Agenda turística de esmadrid.com (datos abiertos del Ayuntamiento):
--     ~1.100 planes con foto. Si un plan ya está en la agenda del Ayuntamiento
--     (mismo título y fechas que se solapan), esa agenda coge su foto y no se
--     duplica; si no, se añade como plan nuevo.
--  2) Las entidades pueden poner una foto propia a sus planes.
--  3) v_eventos tiene una columna nueva al final: imagen.
-- =====================================================================

-- 1) Agenda turística (una fila por plan e idioma: luego se añadirán más idiomas)
create table public.da_agenda_turismo (
  id                  text not null,
  idioma              text not null default 'es',
  titulo              text not null,
  titulo_clave        text,               -- título sin tildes ni signos, para reconocer el mismo plan
  descripcion         text,
  categoria           text,               -- traducida a las categorías de la agenda del Ayuntamiento
  categoria_original  text,
  fecha_inicio        timestamp,
  fecha_fin           timestamp,
  horario             text,
  gratuito            boolean,
  precio              text,
  publico             text,
  lugar               text,
  direccion           text,
  codigo_postal       text,
  localidad           text,
  lat                 double precision,
  lon                 double precision,
  url                 text,
  imagen_url          text,
  fuente              text not null default 'agenda_turismo' references public.da_fuentes(id),
  fecha_carga         timestamptz not null default now(),
  primary key (id, idioma)
);
create index on public.da_agenda_turismo (titulo_clave);

insert into public.da_fuentes (id, nombre, organismo, url_ficha, url_descarga, licencia) values
('agenda_turismo', 'Agenda turística de Madrid (esmadrid.com)', 'Ayuntamiento de Madrid',
 'https://datos.madrid.es/dataset/300028-0-agenda-turismo',
 'https://datos.madrid.es/dataset/300028-0-agenda-turismo/resource/300028-2-agenda-turismo/download/300028-2-agenda-turismo.xml',
 'Condiciones de uso de datos.madrid.es')
on conflict (id) do nothing;

alter table public.da_agenda_turismo enable row level security;
grant select on public.da_agenda_turismo to anon, authenticated;
grant select, insert, update, delete on public.da_agenda_turismo to service_role;
create policy "lectura publica" on public.da_agenda_turismo for select to anon, authenticated using (true);

-- La agenda del Ayuntamiento guarda también la clave del título (la rellena el script de carga)
alter table public.da_agenda_madrid add column titulo_clave text;
create index on public.da_agenda_madrid (titulo_clave);

-- 2) Foto propia de los planes de entidades (en Storage, carpeta de cada cuenta)
alter table public.mm_eventos
  add column foto_url text check (foto_url is null or (char_length(foto_url) <= 500 and foto_url like 'https://%'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-planes', 'fotos-planes', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "subir fotos de mis planes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-planes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cambiar fotos de mis planes" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-planes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "borrar fotos de mis planes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-planes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "ver mis fotos de planes" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-planes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 3) v_eventos con la columna imagen (y los planes de la Agenda turística)
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
  a.organizacion                              as organizacion,
  (select t.imagen_url from public.da_agenda_turismo t
    where t.idioma = 'es' and t.titulo_clave = a.titulo_clave and t.imagen_url is not null
      and t.fecha_inicio::date <= coalesce(a.fecha_fin, a.fecha_inicio)::date
      and coalesce(t.fecha_fin, t.fecha_inicio)::date >= a.fecha_inicio::date
    limit 1)                                  as imagen
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
  'Ayuntamiento de Madrid · Dirección General de Mayores',
  null
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
  p.nombre,
  null
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
  ent.nombre || case when ent.verificada then ' · Entidad verificada' else '' end,
  ev.foto_url
from public.mm_eventos ev
join public.mm_entidades ent on ent.id = ev.entidad_id
where ev.estado = 'publicado'
  and coalesce(ev.fecha_fin, ev.fecha_inicio) >= (now() at time zone 'Europe/Madrid')::date

union all

-- Agenda turística (esmadrid.com): planes con foto que no están ya en la agenda del Ayuntamiento
select
  'agenda_turismo:' || t.id,
  'agenda_turismo',
  t.titulo,
  t.descripcion,
  t.categoria,
  t.fecha_inicio,
  t.fecha_fin,
  t.horario,
  false,
  t.lugar,
  t.direccion,
  t.localidad,
  null,
  t.lat,
  t.lon,
  t.url,
  t.gratuito,
  t.precio,
  null,
  t.publico,
  t.idioma,
  null,
  t.imagen_url
from public.da_agenda_turismo t
where t.idioma = 'es'
  and t.fecha_inicio is not null
  and coalesce(t.fecha_fin, t.fecha_inicio) >= (now() at time zone 'Europe/Madrid')::date
  and not exists (
    select 1 from public.da_agenda_madrid a
    where a.titulo_clave = t.titulo_clave
      and t.fecha_inicio::date <= coalesce(a.fecha_fin, a.fecha_inicio)::date
      and coalesce(t.fecha_fin, t.fecha_inicio)::date >= a.fecha_inicio::date
  );

grant select on public.v_eventos to anon, authenticated, service_role;
