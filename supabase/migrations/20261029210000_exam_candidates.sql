-- =============================================================================
-- Examens nationaux (CFEE, BFEM, BAC) : candidats et résultats.
--
-- Les candidats d'un examen sont les élèves inscrits cette année dans une classe d'un niveau d'examen
-- (levels.exam). La direction (pédagogie ou scolarité) note leur numéro de table et leur centre, imprime la
-- liste, puis saisit les résultats après la proclamation : admis (premier ou second tour, avec mention),
-- admissible au second tour, ajourné, absent. Chaque résultat saisi est notifié aux parents.
-- =============================================================================

create type public.exam_result as enum ('pending', 'admitted', 'second_round', 'admitted_second_round', 'failed', 'absent');
create type public.exam_mention as enum ('passable', 'assez_bien', 'bien', 'tres_bien');

create table public.exam_candidates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  academic_year_id uuid not null,
  student_id uuid not null,
  exam text not null check (exam in ('CFEE', 'BFEM', 'BAC')),
  table_number text check (char_length(table_number) <= 20),
  center text check (char_length(center) <= 120),
  result public.exam_result not null default 'pending',
  mention public.exam_mention,
  result_at timestamptz,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, student_id, exam),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  -- Une mention seulement pour un admis.
  check (mention is null or result in ('admitted', 'admitted_second_round'))
);
create index exam_candidates_school_idx on public.exam_candidates (school_id, academic_year_id, exam);
create index exam_candidates_student_idx on public.exam_candidates (student_id);
comment on table public.exam_candidates is 'Candidats aux examens nationaux (CFEE, BFEM, BAC) : numéro de table, centre, résultat.';

create function private.can_manage_exams(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_academics(p_school_id) or private.can_manage_people(p_school_id);
$$;
revoke all on function private.can_manage_exams(uuid) from public, anon;
grant execute on function private.can_manage_exams(uuid) to authenticated, service_role;

-- Candidat : élève inscrit cette année-là dans une classe d'un niveau de cet examen ; date du résultat tenue à jour.
create function private.check_exam_candidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    join public.levels l on l.id = c.level_id
    where e.student_id = new.student_id and e.academic_year_id = new.academic_year_id and l.exam = new.exam
  ) then
    raise exception 'notCandidate' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' or new.result is distinct from old.result or new.mention is distinct from old.mention then
    new.result_at := case when new.result = 'pending' then null else now() end;
  end if;
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
create trigger exam_candidates_check before insert or update on public.exam_candidates
  for each row execute function private.check_exam_candidate();
create trigger exam_candidates_set_updated_at before update on public.exam_candidates
  for each row execute function private.set_updated_at();

-- Résultat saisi ou corrigé : notifié aux parents ; remis « en attente » : la notification est retirée.
create function private.notify_exam_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.result is not distinct from old.result and new.mention is not distinct from old.mention then
    return new;
  end if;
  if new.result = 'pending' then
    perform private.unnotify('exam:' || new.id::text);
    return new;
  end if;
  perform private.notify(
    private.guardian_users(new.student_id),
    new.school_id,
    'examResult',
    jsonb_build_object('child', private.first_name(new.student_id), 'exam', new.exam, 'result', new.result, 'mention', new.mention),
    '/parent/enfants/' || new.student_id::text,
    'exam:' || new.id::text
  );
  return new;
end;
$$;
create trigger exam_candidates_notify after insert or update on public.exam_candidates
  for each row execute function private.notify_exam_result();

alter table public.exam_candidates enable row level security;
create policy exam_candidates_select on public.exam_candidates for select to authenticated
  using (private.is_staff(school_id) or private.is_guardian_of(student_id) or private.is_platform_admin());
create policy exam_candidates_insert on public.exam_candidates for insert to authenticated
  with check (private.can_manage_exams(school_id));
create policy exam_candidates_update on public.exam_candidates for update to authenticated
  using (private.can_manage_exams(school_id)) with check (private.can_manage_exams(school_id));
create policy exam_candidates_delete on public.exam_candidates for delete to authenticated
  using (private.can_manage_exams(school_id));

revoke all on public.exam_candidates from anon;
revoke update on public.exam_candidates from authenticated;
grant update (table_number, center, result, mention) on public.exam_candidates to authenticated;

-- Enregistrement d'une liste de candidats de l'année en cours (numéros, centres, résultats), en une transaction.
-- p_rows : [{ "student_id": …, "table_number": …, "center": …, "result": "admitted", "mention": "bien" }]
create function public.save_exam_candidates(p_school_id uuid, p_exam text, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_year_id uuid;
  v_count integer;
begin
  select y.id into v_year_id from public.academic_years y where y.school_id = p_school_id and y.is_current;
  if v_year_id is null then
    raise exception 'noYear' using errcode = 'P0001';
  end if;
  insert into public.exam_candidates (school_id, academic_year_id, student_id, exam, table_number, center, result, mention)
  select
    p_school_id,
    v_year_id,
    (r ->> 'student_id')::uuid,
    p_exam,
    nullif(btrim(r ->> 'table_number'), ''),
    nullif(btrim(r ->> 'center'), ''),
    coalesce(nullif(r ->> 'result', ''), 'pending')::public.exam_result,
    nullif(r ->> 'mention', '')::public.exam_mention
  from jsonb_array_elements(p_rows) r
  on conflict (academic_year_id, student_id, exam) do update
    set table_number = excluded.table_number, center = excluded.center, result = excluded.result, mention = excluded.mention
    where (exam_candidates.table_number, exam_candidates.center, exam_candidates.result, exam_candidates.mention)
      is distinct from (excluded.table_number, excluded.center, excluded.result, excluded.mention);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.save_exam_candidates(uuid, text, jsonb) from public, anon;
grant execute on function public.save_exam_candidates(uuid, text, jsonb) to authenticated;
