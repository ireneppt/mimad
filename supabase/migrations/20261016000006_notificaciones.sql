-- =====================================================================
-- Notificaciones dentro de la app: las crea la base de datos con triggers
-- (así nadie puede falsificarlas y funcionan igual en las dos versiones).
-- Los recordatorios ("Mañana tienes…") no se guardan: se calculan al abrir
-- la pantalla a partir de la agenda.
-- =====================================================================

-- Quién provoca el aviso (para su foto y para "Ver su agenda")
alter table public.mm_notificaciones
  add column actor uuid references public.mm_perfiles(id) on delete cascade;

-- Título de un evento para el texto del aviso (si ya no existe, un texto genérico)
create function public.titulo_evento(p_evento text)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select titulo from public.v_eventos where id = p_evento), 'un plan');
$$;
revoke all on function public.titulo_evento(text) from public, anon, authenticated;

create function public.nombre_perfil(p_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select nullif(nombre, '') from public.mm_perfiles where id = p_id), 'Alguien');
$$;
revoke all on function public.nombre_perfil(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Recomendaciones
-- ---------------------------------------------------------------------
create function public.notificar_recomendacion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- A la persona: "Lucía te ha recomendado un plan"
    insert into public.mm_notificaciones (usuario, actor, tipo, titulo, texto, evento_id)
    values (new.para, new.de, 'recomendacion',
            public.nombre_perfil(new.de) || ' te ha recomendado «' || public.titulo_evento(new.evento_id) || '»',
            new.mensaje, new.evento_id);
  elsif new.estado is distinct from old.estado and new.estado in ('aceptada', 'descartada') then
    -- Al familiar: la respuesta
    insert into public.mm_notificaciones (usuario, actor, tipo, titulo, texto, evento_id)
    values (new.de, new.para,
            case when new.estado = 'aceptada' then 'recomendacion_aceptada' else 'recomendacion_descartada' end,
            case when new.estado = 'aceptada'
              then public.nombre_perfil(new.para) || ' se ha apuntado a «' || public.titulo_evento(new.evento_id) || '»'
              else 'A ' || public.nombre_perfil(new.para) || ' no le viene bien «' || public.titulo_evento(new.evento_id) || '»'
            end,
            case when new.estado = 'aceptada' then 'Fue tu recomendación' else null end,
            new.evento_id);
  end if;
  return new;
end;
$$;

create trigger mm_notificar_recomendacion
  after insert or update of estado on public.mm_recomendaciones
  for each row execute function public.notificar_recomendacion();

-- ---------------------------------------------------------------------
-- Inscripciones: la persona acompañada se apunta por su cuenta → a sus familiares
-- (si se lo había recomendado ese familiar, ya avisa la recomendación aceptada)
-- ---------------------------------------------------------------------
create function public.notificar_inscripcion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.mm_notificaciones (usuario, actor, tipo, titulo, evento_id)
  select v.familiar, new.usuario, 'inscripcion',
         public.nombre_perfil(new.usuario) || ' se ha apuntado a «' || public.titulo_evento(new.evento_id) || '»',
         new.evento_id
  from public.mm_vinculos v
  where v.persona = new.usuario and v.estado = 'aceptado'
    and not exists (
      select 1 from public.mm_recomendaciones r
      where r.de = v.familiar and r.para = new.usuario and r.evento_id = new.evento_id
    );
  return new;
end;
$$;

create trigger mm_notificar_inscripcion
  after insert on public.mm_inscripciones
  for each row execute function public.notificar_inscripcion();

-- ---------------------------------------------------------------------
-- Vínculos: aceptar una invitación y dejar de acompañar
-- ---------------------------------------------------------------------
create function public.notificar_vinculo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.estado = 'aceptado' and old.estado is distinct from 'aceptado' then
    insert into public.mm_notificaciones (usuario, actor, tipo, titulo, texto) values
      (new.familiar, new.persona, 'vinculo',
       public.nombre_perfil(new.persona) || ' ha aceptado tu invitación', 'Ya puedes ver su agenda y recomendarle planes'),
      (new.persona, new.familiar, 'vinculo',
       'Ahora ' || public.nombre_perfil(new.familiar) || ' te acompaña', 'Verá tu agenda y te recomendará planes');
  elsif tg_op = 'DELETE' and old.estado = 'aceptado'
        -- Si el vínculo se borra porque alguien ha borrado su cuenta, no se avisa
        and exists (select 1 from public.mm_perfiles where id = old.persona)
        and exists (select 1 from public.mm_perfiles where id = old.familiar) then
    -- Avisar a la otra parte (la que no lo ha deshecho)
    if auth.uid() = old.persona then
      insert into public.mm_notificaciones (usuario, actor, tipo, titulo)
      values (old.familiar, old.persona, 'vinculo_fin', public.nombre_perfil(old.persona) || ' ha dejado de compartir su agenda contigo');
    elsif auth.uid() = old.familiar then
      insert into public.mm_notificaciones (usuario, actor, tipo, titulo)
      values (old.persona, old.familiar, 'vinculo_fin', public.nombre_perfil(old.familiar) || ' ha dejado de acompañarte');
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger mm_notificar_vinculo
  after update of estado or delete on public.mm_vinculos
  for each row execute function public.notificar_vinculo();
