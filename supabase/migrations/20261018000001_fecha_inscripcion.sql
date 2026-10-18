-- =====================================================================
-- Día elegido al apuntarse a un plan de varios días (exposiciones, ferias…)
--
-- Antes, apuntarse a una exposición «hasta el 25» la ponía en la agenda «hoy», y al
-- día siguiente otra vez «hoy». Ahora, en los planes de varios días, la persona elige
-- qué día va a ir y se guarda aquí. En los planes de un día se queda vacío (null).
--
-- Permisos: no hace falta un grant nuevo. authenticated ya tiene insert en toda la tabla
-- (grant de la migración 20261015000001) y la regla «apuntarme» sigue igual: cada persona
-- solo se apunta a sí misma. Que el día esté dentro de las fechas del plan lo comprueba el
-- servidor (las fechas están en la vista v_eventos).
-- =====================================================================

alter table public.mm_inscripciones
  add column fecha date;

alter table public.mm_inscripciones
  add constraint mm_inscripciones_fecha_razonable
  check (fecha is null or fecha between date '2026-01-01' and date '2100-12-31');
