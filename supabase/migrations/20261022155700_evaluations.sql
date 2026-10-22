-- =============================================================================
-- Lot 3.1 — Évaluations : devoirs, interrogations et compositions, par classe × matière × période.
--
-- L'enseignant de la matière (ou le titulaire au préscolaire et à l'élémentaire) crée ses évaluations ;
-- la direction (fondateur, directeur, censeur) programme les compositions et peut tout gérer.
-- Une période verrouillée (periods.locked_at) refuse toute création, modification ou suppression.
-- Codes d'erreur (traduits par l'application) : periodMismatch, subjectNotInLevel, dateOutsidePeriod,
-- periodLocked ; doublon de composition : contrainte evaluations_one_composition (23505).
-- =============================================================================

create type public.evaluation_kind as enum ('devoir', 'interrogation', 'composition');

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  period_id uuid not null,
  kind public.evaluation_kind not null,
  title text not null check (char_length(title) between 2 and 80),
  held_on date not null,
  -- Barème de l'évaluation (null au préscolaire, noté en appréciations) ; la note est ramenée au barème du cycle.
  max_score numeric(5, 2) check (max_score > 0 and max_score <= 100),
  -- Coefficient de l'évaluation au sein de son type (1 par défaut).
  weight numeric(3, 1) not null default 1 check (weight > 0 and weight <= 10),
  published_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade,
  foreign key (period_id, school_id) references public.periods (id, school_id) on delete cascade
);
-- Une seule composition par classe, matière et période.
create unique index evaluations_one_composition on public.evaluations (class_id, subject_id, period_id)
  where kind = 'composition';
create index evaluations_class_period_idx on public.evaluations (class_id, period_id, held_on);
create index evaluations_school_period_kind_idx on public.evaluations (school_id, period_id, kind, held_on);
comment on table public.evaluations is 'Devoirs, interrogations et compositions d''une classe dans une matière, sur une période.';

-- Enseignant de la matière dans la classe, titulaire (préscolaire, élémentaire : toutes les matières),
-- ou direction pédagogique.
create function private.can_grade(p_class_id uuid, p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teaching_assignments ta
    join public.school_staff s on s.id = ta.staff_id
    where ta.class_id = p_class_id and ta.subject_id = p_subject_id
      and s.user_id = (select auth.uid()) and s.status = 'active'
  ) or exists (
    select 1
    from public.classes c
    join public.levels l on l.id = c.level_id
    join public.cycles cy on cy.id = l.cycle_id
    join public.school_staff s on s.id = c.homeroom_staff_id
    where c.id = p_class_id and cy.code in ('prescolaire', 'elementaire')
      and s.user_id = (select auth.uid()) and s.status = 'active'
  ) or exists (
    select 1 from public.classes c where c.id = p_class_id and private.can_manage_academics(c.school_id)
  );
$$;

revoke all on function private.can_grade(uuid, uuid) from public, anon;
grant execute on function private.can_grade(uuid, uuid) to authenticated;

-- Cohérence : période de l'année de la classe, matière du niveau, date dans la période, barème du cycle,
-- période non verrouillée.
create function private.check_evaluation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period public.periods;
  v_scale public.grading_scale;
  v_class_year uuid;
  v_level uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if exists (select 1 from public.periods p where p.id = old.period_id and p.locked_at is not null) then
      raise exception 'periodLocked' using errcode = 'P0001';
    end if;
    if tg_op = 'DELETE' then
      return old;
    end if;
  end if;

  select * into v_period from public.periods p where p.id = new.period_id;
  if v_period.locked_at is not null then
    raise exception 'periodLocked' using errcode = 'P0001';
  end if;

  select c.academic_year_id, c.level_id, cy.grading_scale into v_class_year, v_level, v_scale
  from public.classes c
  join public.levels l on l.id = c.level_id
  join public.cycles cy on cy.id = l.cycle_id
  where c.id = new.class_id;
  if v_class_year is distinct from v_period.academic_year_id then
    raise exception 'periodMismatch' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.level_subjects ls where ls.level_id = v_level and ls.subject_id = new.subject_id
  ) then
    raise exception 'subjectNotInLevel' using errcode = 'P0001';
  end if;
  if new.held_on not between v_period.starts_on and v_period.ends_on then
    raise exception 'dateOutsidePeriod' using errcode = 'P0001';
  end if;

  if v_scale = 'appreciation' then
    new.max_score := null;
  elsif new.max_score is null then
    new.max_score := case v_scale when 'ten' then 10 else 20 end;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger evaluations_check before insert or update or delete on public.evaluations
  for each row execute function private.check_evaluation();

alter table public.evaluations enable row level security;

create policy evaluations_select on public.evaluations
  for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_platform_admin());

create policy evaluations_insert on public.evaluations
  for insert to authenticated
  with check (private.can_grade(class_id, subject_id) and created_by = (select auth.uid()));

create policy evaluations_update on public.evaluations
  for update to authenticated
  using (private.can_grade(class_id, subject_id))
  with check (private.can_grade(class_id, subject_id));

create policy evaluations_delete on public.evaluations
  for delete to authenticated
  using (private.can_grade(class_id, subject_id));

-- La classe, la matière, l'école et l'auteur d'une évaluation ne changent pas.
revoke update on public.evaluations from authenticated;
grant update (kind, title, held_on, max_score, weight, period_id, published_at) on public.evaluations to authenticated;
