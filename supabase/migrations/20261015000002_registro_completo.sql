-- =====================================================================
-- Registro completo: el formulario de "Crear cuenta" manda también el
-- municipio (con su lat/lon), los intereses, el correo opcional y si
-- quiere avisos por WhatsApp. El perfil se rellena con todo al registrarse.
-- =====================================================================

alter table public.mm_perfiles
  add column email_contacto   text,                              -- correo opcional (el login es con el móvil)
  add column avisos_whatsapp  boolean not null default false;

grant update (email_contacto, avisos_whatsapp) on public.mm_perfiles to authenticated;

-- Lee un número de los metadatos del registro; si no es válido, null
create function public.meta_numero(meta jsonb, clave text)
returns double precision
language plpgsql immutable set search_path = ''
as $$
begin
  return (meta ->> clave)::double precision;
exception when others then
  return null;
end;
$$;

create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.mm_perfiles (
    id, nombre, tipo, simplificada, telefono, municipio, barrio, lat, lon,
    intereses, email_contacto, avisos_whatsapp
  )
  values (
    new.id,
    coalesce(meta ->> 'nombre', ''),
    case when meta ->> 'tipo' = 'entidad' then 'entidad' else 'persona' end,
    coalesce(meta ->> 'simplificada', 'false') = 'true',
    meta ->> 'telefono',
    coalesce(nullif(meta ->> 'municipio', ''), 'Madrid'),
    nullif(meta ->> 'barrio', ''),
    public.meta_numero(meta, 'lat'),
    public.meta_numero(meta, 'lon'),
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(
         case when jsonb_typeof(meta -> 'intereses') = 'array' then meta -> 'intereses' else '[]'::jsonb end
       ) as x),
      '{}'
    ),
    nullif(meta ->> 'email_contacto', ''),
    coalesce(meta ->> 'avisos_whatsapp', 'false') = 'true'
  );
  return new;
end;
$$;

revoke all on function public.meta_numero(jsonb, text) from public, anon, authenticated;
