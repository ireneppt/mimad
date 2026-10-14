-- =====================================================================
-- Tablas de datos abiertos (prefijo da_)
-- Las rellena solo el script scripts/ingest con la service role key.
-- La app (anon / authenticated) solo puede LEER, y no todas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo de fuentes: de dónde viene cada dato y cuándo se cargó.
-- Lo usa la app para mostrar "Fuente: ..." en cada pantalla.
-- ---------------------------------------------------------------------
create table public.da_fuentes (
  id              text primary key,          -- p. ej. 'agenda_madrid'
  nombre          text not null,             -- nombre del dataset
  organismo       text not null,             -- quién lo publica
  url_ficha       text not null,             -- ficha en el portal de datos abiertos
  url_descarga    text not null,
  licencia        text,
  ultima_carga    timestamptz,
  filas           integer,
  ultimo_error    text
);

insert into public.da_fuentes (id, nombre, organismo, url_ficha, url_descarga, licencia) values
('centros_atencion_social', 'Registro de centros de atención social', 'Comunidad de Madrid',
 'https://datos.comunidad.madrid/catalogo/dataset/b8cdb7f7-3185-4938-800a-fefda72333f5',
 'https://datos.comunidad.madrid/catalogo/dataset/b8cdb7f7-3185-4938-800a-fefda72333f5/resource/fb98d116-eb79-4100-8cd4-d5ce2e2c439b/download/atencion_social_registro_centros.json',
 'CC BY 4.0'),
('cepi_actividades', 'Actividades de los Centros de Participación e Integración (CEPI)', 'Comunidad de Madrid',
 'https://datos.comunidad.madrid/dataset/bc5a430c-1819-4478-87fc-09c771e0455f',
 'https://datos.comunidad.madrid/dataset/bc5a430c-1819-4478-87fc-09c771e0455f/resource/168d78fb-c202-4d80-9a41-0c8d338d73d1/download/cepi_actividades.json',
 'CC BY 4.0'),
('talleres_envejecimiento', 'Talleres de envejecimiento activo', 'Comunidad de Madrid',
 'https://datos.comunidad.madrid/dataset/a4ae43dd-6f22-4498-b5e8-2ba6308ffa36',
 'https://datos.comunidad.madrid/dataset/a4ae43dd-6f22-4498-b5e8-2ba6308ffa36/resource/b09e9531-e3c8-4bc6-a6f4-a71773af20a0/download/talleres_envejecimiento_activo.json',
 'CC BY 4.0'),
('agenda_madrid', 'Agenda de actividades y eventos', 'Ayuntamiento de Madrid',
 'https://datos.madrid.es/dataset/300107-0-agenda-actividades-eventos',
 'https://datos.madrid.es/dataset/300107-0-agenda-actividades-eventos/resource/300107-5-agenda-actividades-eventos-json/download/300107-5-agenda-actividades-eventos-json.json',
 'Condiciones de uso de datos.madrid.es'),
('centros_mayores', 'Centros municipales de mayores', 'Ayuntamiento de Madrid',
 'https://datos.madrid.es/dataset/200337-0-centros-mayores',
 'https://datos.madrid.es/dataset/200337-0-centros-mayores/resource/200337-1-centros-mayores-json/download/200337-1-centros-mayores-json.json',
 'Condiciones de uso de datos.madrid.es'),
('juntos_contra_soledad', 'Juntos contra la soledad (talleres para mayores)', 'Ayuntamiento de Madrid',
 'https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/JUNTOS_CONTRA_LA_SOLEDAD/MapServer/0',
 'https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/JUNTOS_CONTRA_LA_SOLEDAD/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json',
 'Condiciones de uso de datos.madrid.es');

-- ---------------------------------------------------------------------
-- Registro de centros de atención social (Comunidad de Madrid)
-- ¡OJO! Contiene centros cuya ubicación protege a personas en riesgo
-- (mujeres maltratadas, menores, albergues). Por eso la app NO puede
-- leer esta tabla: solo la vista filtrada v_lugares y la función
-- verificar_nif().
-- ---------------------------------------------------------------------
create table public.da_centros_atencion_social (
  numero_registro          text primary key,
  sector                   text,
  tipo                     text,
  subtipo                  text,
  denominacion             text,
  plazas_autorizadas       integer,
  municipio_codigo         text,
  municipio_nombre         text,
  direccion                text,              -- tipo + nombre de vía + portal, ya montada
  codigo_postal            text,
  area                     text,
  distrito                 text,
  zona                     text,
  coor_x                   text,              -- UTM ETRS89 30N tal como viene
  coor_y                   text,
  lat                      double precision,  -- convertidas por el script de carga
  lon                      double precision,
  telefono                 text,
  correo                   text,
  entidad_denominacion     text,
  entidad_nif              text,
  entidad_naturaleza       text,
  tipo_gestion             text,
  fuente                   text not null default 'centros_atencion_social' references public.da_fuentes(id),
  fecha_carga              timestamptz not null default now()
);
create index on public.da_centros_atencion_social (entidad_nif);
create index on public.da_centros_atencion_social (subtipo);

-- ---------------------------------------------------------------------
-- Actividades de los CEPI. Sin fecha concreta ni dirección:
-- solo mes y centro. La dirección del centro está en mm_cepi_centros.
-- ---------------------------------------------------------------------
create table public.da_cepi_actividades (
  id               text primary key,   -- hash de la fila (no hay id oficial)
  codigo           text,
  centro           text,
  tipo_actividad   text,
  denominacion     text,
  numero_horas     numeric,
  ambito           text,
  subambito        text,
  mes              integer,
  anio             integer,
  idioma           text,               -- deducido del texto ('es' por defecto)
  fuente           text not null default 'cepi_actividades' references public.da_fuentes(id),
  fecha_carga      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Talleres de envejecimiento activo: cuántos talleres de cada tipo
-- hubo en cada municipio y año. Sin fecha ni dirección.
-- ---------------------------------------------------------------------
create table public.da_talleres_envejecimiento (
  id                    text primary key,
  municipio_codigo      text,           -- 4 cifras (INE + dígito de control)
  municipio_nombre      text,
  taller                text,
  numero_adjudicados    integer,
  anio                  integer,
  fuente                text not null default 'talleres_envejecimiento' references public.da_fuentes(id),
  fecha_carga           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Agenda de actividades y eventos del Ayuntamiento de Madrid
-- Fechas en hora local de Madrid (timestamp sin zona).
-- ---------------------------------------------------------------------
create table public.da_agenda_madrid (
  id                     text primary key,
  titulo                 text not null,
  descripcion            text,
  categoria              text,           -- última parte de @type, p. ej. 'CursosTalleres'
  fecha_inicio           timestamp,
  fecha_fin              timestamp,
  hora                   text,
  dias_excluidos         text,
  recurrencia_dias       text,           -- p. ej. 'TU,WE,TH'
  recurrencia_frecuencia text,
  recurrencia_intervalo  integer,
  gratuito               boolean,
  precio                 text,
  publico                text,           -- audience, p. ej. 'Mayores' o 'Niños,Familias'
  url                    text,
  lugar                  text,           -- event-location
  direccion              text,
  codigo_postal          text,
  localidad              text,
  distrito               text,
  barrio                 text,
  lat                    double precision,
  lon                    double precision,
  organizacion           text,
  accesibilidad          text,           -- códigos tal como vienen, p. ej. '1,6'
  fuente                 text not null default 'agenda_madrid' references public.da_fuentes(id),
  fecha_carga            timestamptz not null default now()
);
create index on public.da_agenda_madrid (fecha_fin);

-- ---------------------------------------------------------------------
-- Centros municipales de mayores (Ayuntamiento de Madrid)
-- ---------------------------------------------------------------------
create table public.da_centros_mayores (
  id               text primary key,
  nombre           text not null,
  descripcion      text,
  horario          text,
  servicios        text,
  direccion        text,
  codigo_postal    text,
  localidad        text,
  distrito         text,
  barrio           text,
  lat              double precision,
  lon              double precision,
  url              text,
  accesibilidad    text,
  fuente           text not null default 'centros_mayores' references public.da_fuentes(id),
  fecha_carga      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Juntos contra la soledad: talleres semanales en centros de mayores
-- ---------------------------------------------------------------------
create table public.da_juntos_contra_soledad (
  id                text primary key,   -- OBJECTID
  centro            text,
  direccion         text,
  distrito          text,
  barrio            text,
  tipo_taller       text,
  dia               text,
  horario           text,
  transporte        text,
  descripcion       text,
  mas_informacion   text,
  email             text,
  lat               double precision,
  lon               double precision,
  fuente            text not null default 'juntos_contra_soledad' references public.da_fuentes(id),
  fecha_carga       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------
alter table public.da_fuentes                 enable row level security;
alter table public.da_centros_atencion_social enable row level security;
alter table public.da_cepi_actividades        enable row level security;
alter table public.da_talleres_envejecimiento enable row level security;
alter table public.da_agenda_madrid           enable row level security;
alter table public.da_centros_mayores         enable row level security;
alter table public.da_juntos_contra_soledad   enable row level security;

-- Solo lectura para la app
grant select on public.da_fuentes                 to anon, authenticated;
grant select on public.da_cepi_actividades        to anon, authenticated;
grant select on public.da_talleres_envejecimiento to anon, authenticated;
grant select on public.da_agenda_madrid           to anon, authenticated;
grant select on public.da_centros_mayores         to anon, authenticated;
grant select on public.da_juntos_contra_soledad   to anon, authenticated;

create policy "lectura publica" on public.da_fuentes                 for select to anon, authenticated using (true);
create policy "lectura publica" on public.da_cepi_actividades        for select to anon, authenticated using (true);
create policy "lectura publica" on public.da_talleres_envejecimiento for select to anon, authenticated using (true);
create policy "lectura publica" on public.da_agenda_madrid           for select to anon, authenticated using (true);
create policy "lectura publica" on public.da_centros_mayores         for select to anon, authenticated using (true);
create policy "lectura publica" on public.da_juntos_contra_soledad   for select to anon, authenticated using (true);

-- Atención social: ningún acceso directo (ver comentario de la tabla)
revoke all on public.da_centros_atencion_social from anon, authenticated;

-- ---------------------------------------------------------------------
-- Verificación de entidades: ¿este NIF tiene algún centro registrado?
-- Solo devuelve el nombre de la entidad y cuántos centros tiene,
-- nunca direcciones.
-- ---------------------------------------------------------------------
create function public.verificar_nif(nif text)
returns table (verificada boolean, entidad_denominacion text, numero_centros integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) > 0,
    max(c.entidad_denominacion),
    count(*)::integer
  from public.da_centros_atencion_social c
  where upper(replace(replace(c.entidad_nif, '-', ''), ' ', ''))
      = upper(replace(replace(trim(nif), '-', ''), ' ', ''));
$$;

revoke all on function public.verificar_nif(text) from public;
grant execute on function public.verificar_nif(text) to anon, authenticated;
