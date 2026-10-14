-- =====================================================================
-- Modelo unificado: la app consulta SOLO estas vistas.
--   v_lugares  → sitios a los que ir (hogares de mayores, centros...)
--   v_eventos  → actividades con fecha o recurrentes
--   v_municipios, v_talleres_municipio → apoyo
--
-- Las vistas se ejecutan con los permisos de su dueño (postgres), así que
-- pueden leer da_centros_atencion_social aunque la app no pueda. El filtro
-- de qué centros se muestran está AQUÍ, nunca en el cliente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Centro aproximado de cada municipio: media de las coordenadas de sus
-- centros de atención social. Solo se publica la media, no cada centro.
-- ---------------------------------------------------------------------
create view public.v_municipios as
select
  municipio_codigo                    as codigo,     -- 3 cifras INE
  min(municipio_nombre)               as nombre,
  avg(lat)                            as lat,
  avg(lon)                            as lon,
  count(*)                            as centros
from public.da_centros_atencion_social
where lat is not null and municipio_codigo <> ''
group by municipio_codigo;

-- ---------------------------------------------------------------------
-- Lugares
-- ---------------------------------------------------------------------
create view public.v_lugares as
-- Registro de atención social: SOLO estos subtipos y sectores.
-- Nunca: mujeres maltratadas, acogida de menores, albergues,
-- residencias, pisos tutelados ni rehabilitación.
select
  'atencion_social:' || c.numero_registro               as id,
  c.fuente,
  initcap(c.denominacion)                               as nombre,
  case c.subtipo
    when 'HOGARES Y CLUBES' then 'Hogar o club de mayores. Gestiona: ' || initcap(c.entidad_denominacion)
    when 'TALLERES'         then 'Centro ocupacional con talleres. Gestiona: ' || initcap(c.entidad_denominacion)
    else 'Centro de día (' || lower(c.sector) || '). Gestiona: ' || initcap(c.entidad_denominacion)
  end                                                   as descripcion,
  case c.subtipo
    when 'HOGARES Y CLUBES' then 'Hogar de mayores'
    when 'TALLERES'         then 'Talleres'
    else 'Centro de día'
  end                                                   as categoria,
  c.direccion,
  c.municipio_nombre                                    as municipio,
  c.distrito,
  c.lat,
  c.lon,
  c.telefono,
  c.correo                                              as email,
  null::text                                            as url,
  null::text                                            as horario,
  null::text                                            as accesibilidad,
  case when c.sector = 'Personas mayores' then 'Mayores' else c.sector end as publico
from public.da_centros_atencion_social c
where c.lat is not null
  and (
        c.subtipo in ('HOGARES Y CLUBES', 'TALLERES')
     or (c.subtipo = 'CENTROS DE DÍA: OTROS'
         and c.sector in ('Personas mayores',
                          'Personas con discapacidad intelectual',
                          'Personas con discapacidad física'))
  )

union all

select
  'centros_mayores:' || m.id,
  m.fuente,
  m.nombre,
  m.descripcion,
  'Centro municipal de mayores',
  m.direccion,
  initcap(m.localidad),
  m.distrito,
  m.lat,
  m.lon,
  null,
  null,
  m.url,
  m.horario,
  m.accesibilidad,
  'Mayores'
from public.da_centros_mayores m
where m.lat is not null

union all

select
  'cepi:' || p.centro,
  'cepi_actividades',
  p.nombre,
  'Centro de Participación e Integración de la Comunidad de Madrid: acogida, formación y actividades para personas migrantes.',
  'Centro de integración (CEPI)',
  p.direccion,
  p.municipio,
  null,
  p.lat,
  p.lon,
  null,
  null,
  p.url,
  null,
  null,
  'Personas migrantes'
from public.mm_cepi_centros p;

-- ---------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------
create view public.v_eventos as
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
  'es'::text                                  as idioma
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
  'es'
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
  c.idioma
from public.da_cepi_actividades c
join public.mm_cepi_centros p on p.centro = c.centro
where make_date(c.anio, c.mes, 1) + interval '1 month' > (now() at time zone 'Europe/Madrid')::date;

-- ---------------------------------------------------------------------
-- Talleres de envejecimiento activo por municipio (programa regional).
-- Son datos anuales sin fecha ni dirección: se sitúan en el centro
-- aproximado del municipio. El código del dataset tiene 4 cifras
-- (INE + dígito de control); se cruzan las 3 primeras.
-- ---------------------------------------------------------------------
create view public.v_talleres_municipio as
select
  t.id,
  t.fuente,
  initcap(t.taller)            as taller,
  initcap(t.municipio_nombre)  as municipio,
  t.numero_adjudicados,
  t.anio,
  m.lat,
  m.lon
from public.da_talleres_envejecimiento t
left join public.v_municipios m on m.codigo = left(t.municipio_codigo, 3);

grant select on public.v_municipios          to anon, authenticated;
grant select on public.v_lugares             to anon, authenticated;
grant select on public.v_eventos             to anon, authenticated;
grant select on public.v_talleres_municipio  to anon, authenticated;
