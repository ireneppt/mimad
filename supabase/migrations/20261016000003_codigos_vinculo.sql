-- =====================================================================
-- Códigos de invitación de acompañamiento más seguros:
-- 1) Si el código al azar ya existe, se genera otro (antes la invitación fallaba).
-- 2) Como máximo 10 códigos equivocados por hora y por cuenta, para que nadie
--    pueda ir probando códigos hasta acertar uno.
-- =====================================================================

-- 1) Generar un código que no exista todavía.
-- Es "security definer" para poder ver los códigos de todo el mundo (RLS solo
-- deja ver los propios). La restricción unique sigue siendo la garantía final.
create or replace function public.generar_codigo_vinculo()
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  nuevo text;
begin
  for i in 1..20 loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
      into nuevo
      from generate_series(1, 6);
    if not exists (select 1 from public.mm_vinculos where codigo = nuevo) then
      return nuevo;
    end if;
  end loop;
  raise exception 'No se ha podido crear un código. Prueba otra vez.';
end;
$$;

-- 2) Intentos con un código equivocado (solo los ve la base de datos)
create table public.mm_intentos_codigo (
  id          bigint generated always as identity primary key,
  usuario     uuid not null references public.mm_perfiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index on public.mm_intentos_codigo (usuario, created_at);

alter table public.mm_intentos_codigo enable row level security;
-- Sin permisos para la app: solo la usa aceptar_vinculo() por dentro
revoke all on public.mm_intentos_codigo from anon, authenticated;
grant select, delete on public.mm_intentos_codigo to service_role;

-- aceptar_vinculo cambia lo que devuelve: un código equivocado ya no es un error de la
-- base de datos (eso desharía también el apunte del intento) sino una fila con "error".
-- Los demás problemas (código propio, ya vinculadas, demasiados intentos) siguen siendo errores.
drop function public.aceptar_vinculo(text);

create function public.aceptar_vinculo(p_codigo text)
returns table (vinculo_id uuid, familiar_nombre text, error text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v public.mm_vinculos;
  fallos integer;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión';
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

  -- Acierto: se olvidan los intentos fallidos
  delete from public.mm_intentos_codigo where usuario = auth.uid();

  return query
    select v.id, p.nombre, null::text from public.mm_perfiles p where p.id = v.familiar;
end;
$$;

revoke all on function public.aceptar_vinculo(text) from public, anon;
grant execute on function public.aceptar_vinculo(text) to authenticated;
