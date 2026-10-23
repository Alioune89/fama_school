-- =============================================================================
-- Lot 3.4 — Verrouillage des notes par période et conseil de classe.
--
-- Verrouillage : la direction pédagogique (fondateur, directeur, censeur) verrouille une période avec
-- set_period_lock ; seuls le fondateur et le directeur la déverrouillent. Une période verrouillée refuse
-- toute évaluation, note ou appréciation (déclencheurs des migrations evaluations, grades,
-- subject_appreciations), et ses dates ne changent plus.
--
-- Conseil de classe : pour chaque élève, avertissement ou blâme posés à la main, mention refusée
-- (la mention reste sinon calculée selon la moyenne générale) et appréciation générale du bulletin.
-- Écrit par la direction pédagogique ou le titulaire de la classe, tant que la période est ouverte.
-- Codes d'erreur (traduits par l'application) : forbidden, periodLocked, periodMismatch, unknownStudent.
-- =============================================================================

-- Le verrou ne s'écrit que par set_period_lock.
revoke update on public.periods from authenticated;
grant update (school_id, academic_year_id, position, label, starts_on, ends_on) on public.periods to authenticated;

-- Une période verrouillée garde ses dates et son libellé.
create function private.check_period_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.locked_at is not null and (
    tg_op = 'DELETE'
    or (new.label, new.starts_on, new.ends_on, new.position) is distinct from (old.label, old.starts_on, old.ends_on, old.position)
  ) then
    raise exception 'periodLocked' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger periods_check_lock before update or delete on public.periods
  for each row execute function private.check_period_lock();

create function private.write_period_lock(p_period_id uuid, p_lock boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.periods
  set locked_at = case when p_lock then now() end,
      locked_by = case when p_lock then (select auth.uid()) end
  where id = p_period_id and (locked_at is not null) is distinct from p_lock;
$$;

revoke all on function private.write_period_lock(uuid, boolean) from public, anon;
grant execute on function private.write_period_lock(uuid, boolean) to authenticated;

create function public.set_period_lock(p_period_id uuid, p_lock boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
begin
  select p.school_id into v_school_id from public.periods p where p.id = p_period_id;
  if v_school_id is null
    or not private.can_manage_academics(v_school_id)
    or (not p_lock and not (private.is_platform_admin() or private.has_role(v_school_id, array['owner', 'director']::public.app_role[])))
  then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  perform private.write_period_lock(p_period_id, p_lock);
end;
$$;

revoke all on function public.set_period_lock(uuid, boolean) from public, anon;
grant execute on function public.set_period_lock(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Conseil de classe
-- -----------------------------------------------------------------------------
create type public.council_sanction as enum ('warning', 'blame');

create table public.council_decisions (
  school_id uuid not null,
  class_id uuid not null,
  period_id uuid not null,
  student_id uuid not null,
  sanction public.council_sanction,
  -- Mention (félicitations, encouragements, tableau d'honneur) refusée par le conseil, par exemple pour la conduite.
  withhold_mention boolean not null default false,
  general_appreciation text check (char_length(general_appreciation) between 1 and 400),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (period_id, student_id),
  check (sanction is not null or withhold_mention or general_appreciation is not null),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (period_id, school_id) references public.periods (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index council_decisions_class_idx on public.council_decisions (class_id, period_id);
comment on table public.council_decisions is 'Décisions du conseil de classe par élève et période (bulletin).';

-- Direction pédagogique, ou titulaire de la classe.
create function private.can_hold_council(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    left join public.school_staff s on s.id = c.homeroom_staff_id
    where c.id = p_class_id
      and (private.can_manage_academics(c.school_id) or (s.user_id = (select auth.uid()) and s.status = 'active'))
  );
$$;

revoke all on function private.can_hold_council(uuid) from public, anon;
grant execute on function private.can_hold_council(uuid) to authenticated;

-- Cohérence : période ouverte de l'année de la classe, élève de la classe.
create function private.check_council_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.council_decisions := case when tg_op = 'DELETE' then old else new end;
begin
  if exists (select 1 from public.periods p where p.id = v_row.period_id and p.locked_at is not null) then
    raise exception 'periodLocked' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;

  if not exists (
    select 1 from public.periods p join public.classes c on c.academic_year_id = p.academic_year_id
    where p.id = new.period_id and c.id = new.class_id
  ) then
    raise exception 'periodMismatch' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.enrollments e where e.student_id = new.student_id and e.class_id = new.class_id) then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger council_decisions_check before insert or update or delete on public.council_decisions
  for each row execute function private.check_council_decision();

alter table public.council_decisions enable row level security;

create policy council_decisions_select on public.council_decisions
  for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_platform_admin());

create policy council_decisions_insert on public.council_decisions
  for insert to authenticated
  with check (private.can_hold_council(class_id));

create policy council_decisions_update on public.council_decisions
  for update to authenticated
  using (private.can_hold_council(class_id))
  with check (private.can_hold_council(class_id));

create policy council_decisions_delete on public.council_decisions
  for delete to authenticated
  using (private.can_hold_council(class_id));

revoke update on public.council_decisions from authenticated;
grant update (sanction, withhold_mention, general_appreciation) on public.council_decisions to authenticated;

-- Enregistre les décisions d'une classe :
-- {"<élève>": {"sanction": "warning" | "blame" | null, "withholdMention": bool, "appreciation": "texte"}} ;
-- une décision vide (ni sanction, ni mention refusée, ni appréciation) est effacée.
create function public.save_council_decisions(p_class_id uuid, p_period_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
begin
  select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  if v_school_id is null or not private.can_hold_council(p_class_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  with items as (
    select
      private.try_uuid(i.key) as student_id,
      nullif(i.value ->> 'sanction', '')::public.council_sanction as sanction,
      coalesce((i.value ->> 'withholdMention')::boolean, false) as withhold_mention,
      nullif(btrim(coalesce(i.value ->> 'appreciation', '')), '') as general_appreciation
    from jsonb_each(p_items) i
  ),
  removed as (
    delete from public.council_decisions d
    using items
    where d.period_id = p_period_id and d.student_id = items.student_id
      and items.sanction is null and not items.withhold_mention and items.general_appreciation is null
  )
  insert into public.council_decisions (school_id, class_id, period_id, student_id, sanction, withhold_mention, general_appreciation)
  select v_school_id, p_class_id, p_period_id, student_id, sanction, withhold_mention, general_appreciation
  from items
  where sanction is not null or withhold_mention or general_appreciation is not null
  on conflict (period_id, student_id) do update
    set sanction = excluded.sanction,
        withhold_mention = excluded.withhold_mention,
        general_appreciation = excluded.general_appreciation
    where (public.council_decisions.sanction, public.council_decisions.withhold_mention, public.council_decisions.general_appreciation)
      is distinct from (excluded.sanction, excluded.withhold_mention, excluded.general_appreciation);
end;
$$;

revoke all on function public.save_council_decisions(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_council_decisions(uuid, uuid, jsonb) to authenticated;
