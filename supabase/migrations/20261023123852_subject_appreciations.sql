-- =============================================================================
-- Lot 3.2 (suite) — Appréciations par matière : une phrase de l'enseignant par élève, matière et période,
-- reprise sur le bulletin. L'application propose une phrase selon la moyenne ; l'enseignant la modifie.
--
-- Écrit par qui note la matière (private.can_grade) tant que la période est ouverte ; lu par le personnel
-- et les enseignants de la classe (les parents la verront sur le bulletin, Lot 3.5).
-- Codes d'erreur (traduits par l'application) : periodLocked, periodMismatch, subjectNotInLevel, unknownStudent.
-- =============================================================================

create table public.subject_appreciations (
  school_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  period_id uuid not null,
  student_id uuid not null,
  text text not null check (char_length(text) between 1 and 300),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (period_id, subject_id, student_id),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade,
  foreign key (period_id, school_id) references public.periods (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index subject_appreciations_class_idx on public.subject_appreciations (class_id, period_id);
comment on table public.subject_appreciations is 'Appréciation de l''enseignant par élève, matière et période (bulletin).';

-- Cohérence : période de l'année de la classe et non verrouillée, matière du niveau, élève de la classe.
create function private.check_subject_appreciation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.subject_appreciations := case when tg_op = 'DELETE' then old else new end;
begin
  if exists (
    select 1 from public.periods p
    where p.id in (v_row.period_id, case when tg_op = 'UPDATE' then old.period_id end) and p.locked_at is not null
  ) then
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
  if not exists (
    select 1 from public.classes c join public.level_subjects ls on ls.level_id = c.level_id
    where c.id = new.class_id and ls.subject_id = new.subject_id
  ) then
    raise exception 'subjectNotInLevel' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.enrollments e where e.student_id = new.student_id and e.class_id = new.class_id) then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger subject_appreciations_check before insert or update or delete on public.subject_appreciations
  for each row execute function private.check_subject_appreciation();

alter table public.subject_appreciations enable row level security;

create policy subject_appreciations_select on public.subject_appreciations
  for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_platform_admin());

create policy subject_appreciations_insert on public.subject_appreciations
  for insert to authenticated
  with check (private.can_grade(class_id, subject_id));

create policy subject_appreciations_update on public.subject_appreciations
  for update to authenticated
  using (private.can_grade(class_id, subject_id))
  with check (private.can_grade(class_id, subject_id));

create policy subject_appreciations_delete on public.subject_appreciations
  for delete to authenticated
  using (private.can_grade(class_id, subject_id));

-- Seul le texte change (voir save_subject_appreciations).
revoke update on public.subject_appreciations from authenticated;
grant update (text) on public.subject_appreciations to authenticated;

-- Enregistre les appréciations d'une classe dans une matière : {"<élève>": "texte"} ; un texte vide efface.
create function public.save_subject_appreciations(p_class_id uuid, p_subject_id uuid, p_period_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
begin
  select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  if v_school_id is null or not private.can_grade(p_class_id, p_subject_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  delete from public.subject_appreciations a
  using jsonb_each_text(p_items) i
  where a.period_id = p_period_id and a.subject_id = p_subject_id
    and a.student_id = private.try_uuid(i.key) and btrim(i.value) = '';

  insert into public.subject_appreciations (school_id, class_id, subject_id, period_id, student_id, text)
  select v_school_id, p_class_id, p_subject_id, p_period_id, private.try_uuid(i.key), btrim(i.value)
  from jsonb_each_text(p_items) i
  where btrim(i.value) <> ''
  on conflict (period_id, subject_id, student_id) do update set text = excluded.text
  where public.subject_appreciations.text is distinct from excluded.text;
end;
$$;

revoke all on function public.save_subject_appreciations(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_subject_appreciations(uuid, uuid, uuid, jsonb) to authenticated;
