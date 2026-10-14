-- =====================================================================
-- Direcciones de los 8 CEPI (centros de participación e integración).
-- El dataset de actividades no trae dirección, así que se mantiene a mano.
-- Direcciones: web de la Comunidad de Madrid
--   https://www.comunidad.madrid/servicios/servicios-sociales/centros-participacion-e-integracion
-- Coordenadas: OpenStreetMap (Nominatim), consultadas el 14/10/2026.
-- 'centro' coincide exactamente con el campo centro del dataset.
-- =====================================================================

create table public.mm_cepi_centros (
  centro       text primary key,
  nombre       text not null,
  direccion    text not null,
  municipio    text not null,
  lat          double precision not null,
  lon          double precision not null,
  url          text
);

insert into public.mm_cepi_centros (centro, nombre, direccion, municipio, lat, lon, url)
select c.*, 'https://www.comunidad.madrid/servicios/servicios-sociales/centros-participacion-e-integracion'
from (values
('ALCALÁ DE HENARES', 'CEPI Alcalá de Henares',   'Calle Torrelaguna, 9',                    'Alcalá de Henares',             40.4894437, -3.3729370),
('ALCOBENDAS-SANSE',  'CEPI Alcobendas-San Sebastián de los Reyes', 'Calle Viento, 2',       'San Sebastián de los Reyes',    40.5472429, -3.6265505),
('COLLADO VILLALBA',  'CEPI Collado Villalba',    'Camino del Berrocal, 6',                  'Collado Villalba',              40.6327175, -4.0061951),
('LEGANES',           'CEPI Leganés',             'Avenida Rey Juan Carlos I, 6',            'Leganés',                       40.3347804, -3.7586461),
('CENTRO-ARGANZUELA', 'CEPI Centro-Arganzuela',   'Ronda de Segovia, 34',                    'Madrid',                        40.4077527, -3.7152839),
('CHAMARTIN',         'CEPI Chamartín',           'Calle Canillas, 11',                      'Madrid',                        40.4417991, -3.6752208),
('TETUAN',            'CEPI Tetuán',              'Calle Nuestra Señora del Carmen, 17',     'Madrid',                        40.4597768, -3.7030402),
('USERA-VILLAVERDE',  'CEPI Usera-Villaverde',    'Calle Francisco del Pino, 16',            'Madrid',                        40.3498910, -3.6890043)
) as c(centro, nombre, direccion, municipio, lat, lon);

alter table public.mm_cepi_centros enable row level security;
grant select on public.mm_cepi_centros to anon, authenticated;
create policy "lectura publica" on public.mm_cepi_centros for select to anon, authenticated using (true);
