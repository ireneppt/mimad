-- =====================================================================
-- Tablas propias de la app (prefijo mm_): datos de las personas usuarias.
--
-- Regla general: cada persona solo ve lo suyo. Un familiar solo ve el
-- perfil y la agenda de su persona vinculada, y solo si el vínculo está
-- aceptado. La app usa el rol "authenticated" (con sesión); "anon" (sin
-- sesión) no tiene acceso a ninguna de estas tablas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfiles: una fila por persona registrada (se crea sola al registrarse)
-- ---------------------------------------------------------------------
create table public.mm_perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null default '',
  tipo          text not null default 'persona' check (tipo in ('persona', 'entidad')),
  simplificada  boolean not null default false,   -- interruptor de versión simplificada
  telefono      text,                              -- texto: puede empezar por 0 o llevar prefijo
  barrio        text,
  municipio     text default 'Madrid',
  lat           double precision,                  -- ubicación aproximada de casa (centro del barrio)
  lon           double precision,
  intereses     text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Vínculos de acompañamiento: familiar (quien acompaña) ↔ persona.
-- El familiar crea el vínculo y recibe un código; la persona lo usa
-- con aceptar_vinculo(codigo) y el vínculo pasa a "aceptado".
-- ---------------------------------------------------------------------
create table public.mm_vinculos (
  id           uuid primary key default gen_random_uuid(),
  familiar     uuid not null default auth.uid() references public.mm_perfiles(id) on delete cascade,
  persona      uuid references public.mm_perfiles(id) on delete cascade,  -- vacío hasta que se acepta
  codigo       text not null unique,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aceptado')),
  expira_at    timestamptz not null default now() + interval '7 days',
  aceptado_at  timestamptz,
  created_at   timestamptz not null default now(),
  check (familiar <> persona)
);
create index on public.mm_vinculos (familiar);
create index on public.mm_vinculos (persona);
-- No puede haber dos vínculos entre las mismas dos personas
create unique index mm_vinculos_pareja on public.mm_vinculos (familiar, persona) where persona is not null;

-- ---------------------------------------------------------------------
-- Inscripciones: "me apunto a este plan"
-- ---------------------------------------------------------------------
create table public.mm_inscripciones (
  id          uuid primary key default gen_random_uuid(),
  usuario     uuid not null default auth.uid() references public.mm_perfiles(id) on delete cascade,
  evento_id   text not null,          -- id de v_eventos, p. ej. 'agenda_madrid:50430455'
  created_at  timestamptz not null default now(),
  unique (usuario, evento_id)
);

-- ---------------------------------------------------------------------
-- Recomendaciones: un familiar recomienda un plan a su persona vinculada
-- ---------------------------------------------------------------------
create table public.mm_recomendaciones (
  id          uuid primary key default gen_random_uuid(),
  de          uuid not null default auth.uid() references public.mm_perfiles(id) on delete cascade,
  para        uuid not null references public.mm_perfiles(id) on delete cascade,
  evento_id   text not null,
  mensaje     text check (char_length(mensaje) <= 500),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'descartada')),
  created_at  timestamptz not null default now()
);
create index on public.mm_recomendaciones (para);
create index on public.mm_recomendaciones (de);

-- ---------------------------------------------------------------------
-- Notificaciones dentro de la app. Las crea la base de datos (triggers),
-- nunca el navegador.
-- ---------------------------------------------------------------------
create table public.mm_notificaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario     uuid not null references public.mm_perfiles(id) on delete cascade,
  tipo        text not null,          -- 'recomendacion', 'vinculo', 'recordatorio', 'plan_cerca'...
  titulo      text not null,
  texto       text,
  evento_id   text,
  leida       boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.mm_notificaciones (usuario, leida);

-- ---------------------------------------------------------------------
-- Entidades (organizaciones). "verificada" la calcula la base de datos
-- cruzando el NIF con el Registro de centros de atención social.
-- ---------------------------------------------------------------------
create table public.mm_entidades (
  id              uuid primary key default gen_random_uuid(),
  usuario         uuid not null unique default auth.uid() references public.mm_perfiles(id) on delete cascade,
  nombre          text not null,
  nif             text not null,
  nombre_oficial  text,               -- nombre en el registro, si se encuentra
  verificada      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Eventos creados por entidades. "estado" lo calcula la base de datos:
-- publicado si la entidad está verificada, pendiente si no.
-- ---------------------------------------------------------------------
create table public.mm_eventos (
  id            uuid primary key default gen_random_uuid(),
  entidad_id    uuid not null references public.mm_entidades(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  categoria     text,
  fecha_inicio  timestamp not null,   -- hora local de Madrid, como en da_agenda_madrid
  fecha_fin     timestamp,
  direccion     text,
  municipio     text default 'Madrid',
  lat           double precision,
  lon           double precision,
  gratuito      boolean not null default true,
  precio        text,
  publico       text,
  accesible     boolean not null default false,
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'publicado', 'rechazado')),
  created_at    timestamptz not null default now()
);
create index on public.mm_eventos (entidad_id);

-- =====================================================================
-- Funciones auxiliares para las reglas de seguridad.
-- Son "security definer" para poder mirar mm_vinculos sin que las reglas
-- de una tabla llamen a las de otra en bucle.
-- =====================================================================

-- ¿La persona con sesión acompaña a "p_persona" con un vínculo aceptado?
create function public.es_familiar_de(p_persona uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mm_vinculos v
    where v.familiar = auth.uid() and v.persona = p_persona and v.estado = 'aceptado'
  );
$$;

-- ¿La persona con sesión tiene un vínculo aceptado con "p_otra", en cualquier sentido?
create function public.tiene_vinculo_con(p_otra uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mm_vinculos v
    where v.estado = 'aceptado'
      and ((v.familiar = auth.uid() and v.persona = p_otra)
        or (v.persona = auth.uid() and v.familiar = p_otra))
  );
$$;

-- Código de invitación de 6 caracteres, sin letras que se confunden (0/O, 1/I/L)
create function public.generar_codigo_vinculo()
returns text
language sql volatile set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

alter table public.mm_vinculos alter column codigo set default public.generar_codigo_vinculo();

-- La persona acepta una invitación escribiendo el código
create function public.aceptar_vinculo(p_codigo text)
returns table (vinculo_id uuid, familiar_nombre text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v public.mm_vinculos;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión';
  end if;

  select * into v from public.mm_vinculos
  where codigo = upper(trim(p_codigo)) and estado = 'pendiente' and expira_at > now();

  if not found then
    raise exception 'El código no es válido o ha caducado. Pide uno nuevo.';
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

  return query
    select v.id, p.nombre from public.mm_perfiles p where p.id = v.familiar;
end;
$$;

-- =====================================================================
-- Triggers
-- =====================================================================

-- Al registrarse, crear el perfil con los datos del formulario
-- (options.data en supabase.auth.signUp: nombre, telefono, simplificada, tipo)
create function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.mm_perfiles (id, nombre, tipo, simplificada, telefono)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    case when new.raw_user_meta_data ->> 'tipo' = 'entidad' then 'entidad' else 'persona' end,
    coalesce(new.raw_user_meta_data ->> 'simplificada', 'false') = 'true',
    new.raw_user_meta_data ->> 'telefono'
  );
  return new;
end;
$$;

create trigger mm_crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Entidades: verificar el NIF en el servidor cada vez que se guarda
create function public.verificar_entidad()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  r record;
begin
  new.nif := upper(replace(replace(trim(new.nif), '-', ''), ' ', ''));
  select * into r from public.verificar_nif(new.nif);
  new.verificada := coalesce(r.verificada, false);
  new.nombre_oficial := r.entidad_denominacion;
  return new;
end;
$$;

create trigger mm_verificar_entidad
  before insert or update of nif on public.mm_entidades
  for each row execute function public.verificar_entidad();

-- Eventos de entidades: el estado lo decide la base de datos, no el navegador.
-- Solo se aplica a la app (rol authenticated); desde el SQL Editor se puede
-- moderar a mano cambiando "estado".
create function public.estado_evento_entidad()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'UPDATE' and old.estado = 'rechazado' then
      new.estado := 'rechazado';
    elsif exists (select 1 from public.mm_entidades e where e.id = new.entidad_id and e.verificada) then
      new.estado := 'publicado';
    else
      new.estado := 'pendiente';
    end if;
  end if;
  return new;
end;
$$;

create trigger mm_estado_evento
  before insert or update on public.mm_eventos
  for each row execute function public.estado_evento_entidad();

-- =====================================================================
-- Permisos (grants) y reglas por fila (RLS)
-- =====================================================================
alter table public.mm_perfiles        enable row level security;
alter table public.mm_vinculos        enable row level security;
alter table public.mm_inscripciones   enable row level security;
alter table public.mm_recomendaciones enable row level security;
alter table public.mm_notificaciones  enable row level security;
alter table public.mm_entidades       enable row level security;
alter table public.mm_eventos         enable row level security;

-- --- Perfiles: ver el mío y el de quien tengo vínculo aceptado; editar solo el mío
grant select on public.mm_perfiles to authenticated;
grant update (nombre, simplificada, telefono, barrio, municipio, lat, lon, intereses)
  on public.mm_perfiles to authenticated;

create policy "ver mi perfil y el de mis vinculos" on public.mm_perfiles
  for select to authenticated
  using (id = (select auth.uid()) or public.tiene_vinculo_con(id));
create policy "editar mi perfil" on public.mm_perfiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- --- Vínculos: los ven las dos partes; lo crea el familiar; lo puede borrar cualquiera de las dos.
-- Aceptar se hace solo con aceptar_vinculo() (no hay permiso de update).
grant select, insert, delete on public.mm_vinculos to authenticated;

create policy "ver mis vinculos" on public.mm_vinculos
  for select to authenticated
  using (familiar = (select auth.uid()) or persona = (select auth.uid()));
create policy "crear invitacion" on public.mm_vinculos
  for insert to authenticated
  with check (familiar = (select auth.uid()) and persona is null and estado = 'pendiente');
create policy "deshacer vinculo" on public.mm_vinculos
  for delete to authenticated
  using (familiar = (select auth.uid()) or persona = (select auth.uid()));

-- --- Inscripciones: las mías (crear/borrar); el familiar puede VER las de su persona
grant select, insert, delete on public.mm_inscripciones to authenticated;

create policy "ver mis inscripciones y las de mi persona" on public.mm_inscripciones
  for select to authenticated
  using (usuario = (select auth.uid()) or public.es_familiar_de(usuario));
create policy "apuntarme" on public.mm_inscripciones
  for insert to authenticated
  with check (usuario = (select auth.uid()));
create policy "desapuntarme" on public.mm_inscripciones
  for delete to authenticated
  using (usuario = (select auth.uid()));

-- --- Recomendaciones: solo entre personas con vínculo aceptado (familiar → persona)
grant select, insert, delete on public.mm_recomendaciones to authenticated;
grant update (estado) on public.mm_recomendaciones to authenticated;

create policy "ver recomendaciones enviadas y recibidas" on public.mm_recomendaciones
  for select to authenticated
  using (de = (select auth.uid()) or para = (select auth.uid()));
create policy "recomendar a mi persona" on public.mm_recomendaciones
  for insert to authenticated
  with check (de = (select auth.uid()) and public.es_familiar_de(para));
create policy "responder a una recomendacion" on public.mm_recomendaciones
  for update to authenticated
  using (para = (select auth.uid())) with check (para = (select auth.uid()));
create policy "borrar una recomendacion enviada" on public.mm_recomendaciones
  for delete to authenticated
  using (de = (select auth.uid()));

-- --- Notificaciones: ver, marcar como leída y borrar las mías
grant select, delete on public.mm_notificaciones to authenticated;
grant update (leida) on public.mm_notificaciones to authenticated;

create policy "ver mis notificaciones" on public.mm_notificaciones
  for select to authenticated using (usuario = (select auth.uid()));
create policy "marcar como leida" on public.mm_notificaciones
  for update to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));
create policy "borrar mis notificaciones" on public.mm_notificaciones
  for delete to authenticated using (usuario = (select auth.uid()));

-- --- Entidades: cada usuario gestiona solo la suya
grant select, insert on public.mm_entidades to authenticated;
grant update (nombre, nif) on public.mm_entidades to authenticated;

create policy "ver mi entidad" on public.mm_entidades
  for select to authenticated using (usuario = (select auth.uid()));
create policy "crear mi entidad" on public.mm_entidades
  for insert to authenticated with check (usuario = (select auth.uid()));
create policy "editar mi entidad" on public.mm_entidades
  for update to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));

-- --- Eventos de entidades: la entidad gestiona los suyos.
-- El público los verá a través de v_eventos (tarea A10), solo si están publicados.
grant select, insert, update, delete on public.mm_eventos to authenticated;

create policy "ver mis eventos" on public.mm_eventos
  for select to authenticated
  using (exists (select 1 from public.mm_entidades e
                 where e.id = entidad_id and e.usuario = (select auth.uid())));
create policy "crear eventos de mi entidad" on public.mm_eventos
  for insert to authenticated
  with check (exists (select 1 from public.mm_entidades e
                      where e.id = entidad_id and e.usuario = (select auth.uid())));
create policy "editar mis eventos" on public.mm_eventos
  for update to authenticated
  using (exists (select 1 from public.mm_entidades e
                 where e.id = entidad_id and e.usuario = (select auth.uid())))
  with check (exists (select 1 from public.mm_entidades e
                      where e.id = entidad_id and e.usuario = (select auth.uid())));
create policy "borrar mis eventos" on public.mm_eventos
  for delete to authenticated
  using (exists (select 1 from public.mm_entidades e
                 where e.id = entidad_id and e.usuario = (select auth.uid())));

-- --- Funciones: solo para usuarios con sesión
revoke all on function public.es_familiar_de(uuid)        from public, anon;
revoke all on function public.tiene_vinculo_con(uuid)     from public, anon;
revoke all on function public.aceptar_vinculo(text)       from public, anon;
revoke all on function public.generar_codigo_vinculo()    from public, anon;
grant execute on function public.es_familiar_de(uuid)     to authenticated;
grant execute on function public.tiene_vinculo_con(uuid)  to authenticated;
grant execute on function public.aceptar_vinculo(text)    to authenticated;
grant execute on function public.generar_codigo_vinculo() to authenticated;

-- --- service_role: lo usan los scripts (cuentas de demo, comprobaciones). Nunca la app.
grant select, insert, update, delete on
  public.mm_perfiles, public.mm_vinculos, public.mm_inscripciones, public.mm_recomendaciones,
  public.mm_notificaciones, public.mm_entidades, public.mm_eventos
  to service_role;
grant execute on function public.generar_codigo_vinculo() to service_role;
grant execute on function public.verificar_nif(text)       to service_role;
