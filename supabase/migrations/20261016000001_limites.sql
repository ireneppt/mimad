-- =====================================================================
-- Límites de longitud en los datos que escribe la gente.
-- La app ya los controla (src/lib/limits.ts), pero alguien podría llamar
-- a la API directamente: la base de datos es la última barrera.
-- Son algo más amplios que los del formulario a propósito.
-- =====================================================================

alter table public.mm_perfiles
  add constraint mm_perfiles_nombre_largo      check (char_length(nombre) <= 60),
  add constraint mm_perfiles_telefono_formato  check (telefono is null or telefono ~ '^\+?[0-9]{6,16}$'),
  add constraint mm_perfiles_municipio_largo   check (char_length(municipio) <= 80),
  add constraint mm_perfiles_barrio_largo      check (char_length(barrio) <= 80),
  add constraint mm_perfiles_email_largo       check (char_length(email_contacto) <= 120),
  add constraint mm_perfiles_intereses_max     check (cardinality(intereses) <= 20),
  add constraint mm_perfiles_lat_valida        check (lat is null or lat between -90 and 90),
  add constraint mm_perfiles_lon_valida        check (lon is null or lon between -180 and 180);

alter table public.mm_entidades
  add constraint mm_entidades_nombre_largo check (char_length(nombre) between 2 and 120),
  add constraint mm_entidades_nif_largo    check (char_length(nif) between 8 and 15);

alter table public.mm_eventos
  add constraint mm_eventos_titulo_largo      check (char_length(titulo) between 3 and 150),
  add constraint mm_eventos_descripcion_larga check (char_length(descripcion) <= 3000),
  add constraint mm_eventos_categoria_larga   check (char_length(categoria) <= 60),
  add constraint mm_eventos_direccion_larga   check (char_length(direccion) <= 200),
  add constraint mm_eventos_municipio_largo   check (char_length(municipio) <= 80),
  add constraint mm_eventos_precio_largo      check (char_length(precio) <= 100),
  add constraint mm_eventos_publico_largo     check (char_length(publico) <= 100),
  add constraint mm_eventos_fechas            check (fecha_fin is null or fecha_fin >= fecha_inicio);

alter table public.mm_inscripciones
  add constraint mm_inscripciones_evento_largo check (char_length(evento_id) <= 200);

alter table public.mm_recomendaciones
  add constraint mm_recomendaciones_evento_largo check (char_length(evento_id) <= 200);
