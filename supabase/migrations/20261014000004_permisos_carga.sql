-- =====================================================================
-- Permisos para el script de carga (rol service_role).
-- Con "Automatically expose new tables" desactivado, las tablas nuevas
-- no tienen permisos para NINGÚN rol de la API, tampoco service_role.
-- Este rol solo lo usa scripts/ingest (clave secreta, nunca en la app).
-- =====================================================================

grant select, insert, update, delete on public.da_fuentes                 to service_role;
grant select, insert, update, delete on public.da_centros_atencion_social to service_role;
grant select, insert, update, delete on public.da_cepi_actividades        to service_role;
grant select, insert, update, delete on public.da_talleres_envejecimiento to service_role;
grant select, insert, update, delete on public.da_agenda_madrid           to service_role;
grant select, insert, update, delete on public.da_centros_mayores         to service_role;
grant select, insert, update, delete on public.da_juntos_contra_soledad   to service_role;
grant select, insert, update, delete on public.mm_cepi_centros            to service_role;

grant select on public.v_municipios, public.v_lugares, public.v_eventos, public.v_talleres_municipio to service_role;
