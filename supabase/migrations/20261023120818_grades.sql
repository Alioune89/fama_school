-- =============================================================================
-- Lot 3.2 — Saisie des notes : une note (ou un niveau d'acquisition au préscolaire) par élève et par évaluation.
--
-- L'enseignant saisit toute la feuille d'une évaluation sur son téléphone, hors ligne compris, puis l'envoie :
-- submit_grades est idempotente (identifiant d'opération) et la saisie la plus récente l'emporte.
-- Un élève absent a 0 ; excusé, l'évaluation ne compte pas pour lui (src/lib/domain/grading.ts).
-- Les parents voient les notes de leur enfant une fois l'évaluation publiée (evaluations.published_at).
-- Codes d'erreur (traduits par l'application) : forbidden, unknownEvaluation, periodLocked, invalidGrade,
-- maxBelowScores (barème abaissé sous une note déjà saisie).
-- =============================================================================

create type public.grade_status as enum ('graded', 'absent', 'excused');
create type public.acquisition_level as enum ('acquired', 'in_progress', 'not_acquired');

-- Heure de la dernière saisie de la feuille, prise sur le téléphone : la plus récente l'emporte.
alter table public.evaluations
  add column grades_entered_at timestamptz,
  add column grades_entered_by uuid references auth.users (id) on delete set null;

create table public.grades (
  evaluation_id uuid not null,
  school_id uuid not null,
  student_id uuid not null,
  status public.grade_status not null,
  -- Note brute sur le barème de l'évaluation (cycles notés sur 10 ou sur 20).
  score numeric(5, 2) check (score >= 0),
  -- Niveau d'acquisition (préscolaire).
  acquisition public.acquisition_level,
  updated_at timestamptz not null default now(),
  primary key (evaluation_id, student_id),
  check (score is null or acquisition is null),
  check ((status = 'graded') = (score is not null or acquisition is not null)),
  foreign key (evaluation_id, school_id) references public.evaluations (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index grades_student_idx on public.grades (student_id);
comment on table public.grades is 'Notes des élèves, écrites seulement par public.submit_grades.';

-- Parent d'un élève inscrit (ou passé) dans la classe.
create function private.is_guardian_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e where e.class_id = p_class_id and private.is_guardian_of(e.student_id)
  );
$$;

-- Lecture d'une note : enseignant de la classe, ou parent de l'élève si l'évaluation est publiée.
create function private.can_view_grade(p_evaluation_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.evaluations e
    where e.id = p_evaluation_id
      and (private.teaches_class(e.class_id) or (e.published_at is not null and private.is_guardian_of(p_student_id)))
  );
$$;

revoke all on function private.is_guardian_in_class(uuid) from public, anon;
revoke all on function private.can_view_grade(uuid, uuid) from public, anon;
grant execute on function private.is_guardian_in_class(uuid) to authenticated;
grant execute on function private.can_view_grade(uuid, uuid) to authenticated;

alter table public.grades enable row level security;

create policy grades_select on public.grades
  for select to authenticated
  using (private.is_staff(school_id) or private.is_platform_admin() or private.can_view_grade(evaluation_id, student_id));

revoke insert, update, delete on public.grades from authenticated, anon;

-- Les parents voient les évaluations publiées de la classe de leur enfant.
create policy evaluations_select_guardian on public.evaluations
  for select to authenticated
  using (published_at is not null and private.is_guardian_in_class(class_id));

-- Le barème d'une évaluation ne descend pas sous une note déjà saisie.
create function private.check_evaluation_scores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.max_score is distinct from old.max_score
    and exists (select 1 from public.grades g where g.evaluation_id = new.id and g.score > coalesce(new.max_score, 0)) then
    raise exception 'maxBelowScores' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger evaluations_check_scores before update of max_score on public.evaluations
  for each row execute function private.check_evaluation_scores();

-- Une entrée de la feuille : {"status": "graded", "score": 14.5}, {"status": "graded", "acquisition": "acquired"},
-- {"status": "absent"} ou {"status": "excused"}.
create function private.is_valid_grade(p_value jsonb, p_scale public.grading_scale, p_max numeric)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_value) is distinct from 'object' then
    return false;
  end if;
  if p_value ->> 'status' in ('absent', 'excused') then
    return true;
  end if;
  if p_value ->> 'status' is distinct from 'graded' then
    return false;
  end if;
  if p_scale = 'appreciation' then
    return coalesce(p_value ->> 'acquisition' in ('acquired', 'in_progress', 'not_acquired'), false);
  end if;
  if jsonb_typeof(p_value -> 'score') is distinct from 'number' then
    return false;
  end if;
  return (p_value ->> 'score')::numeric between 0 and p_max;
end;
$$;

revoke all on function private.is_valid_grade(jsonb, public.grading_scale, numeric) from public, anon;
grant execute on function private.is_valid_grade(jsonb, public.grading_scale, numeric) to authenticated;

-- Écrit la feuille : les élèves de la classe absents de la feuille n'ont plus de note.
create function private.save_grades(
  p_evaluation_id uuid,
  p_school_id uuid,
  p_class_id uuid,
  p_entered_at timestamptz,
  p_marks jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evaluations
  set grades_entered_at = p_entered_at, grades_entered_by = (select auth.uid())
  where id = p_evaluation_id;

  delete from public.grades g
  where g.evaluation_id = p_evaluation_id
    and not p_marks ? g.student_id::text
    and exists (
      select 1 from public.enrollments e
      where e.student_id = g.student_id and e.class_id = p_class_id and e.status = 'active'
    );

  insert into public.grades (evaluation_id, school_id, student_id, status, score, acquisition)
  select
    p_evaluation_id,
    p_school_id,
    e.student_id,
    (m.value ->> 'status')::public.grade_status,
    case when m.value ->> 'status' = 'graded' then round((m.value ->> 'score')::numeric, 2) end,
    case when m.value ->> 'status' = 'graded' then (m.value ->> 'acquisition')::public.acquisition_level end
  from jsonb_each(p_marks) m
  join public.enrollments e
    on e.student_id = private.try_uuid(m.key) and e.class_id = p_class_id and e.status = 'active'
  on conflict (evaluation_id, student_id) do update
    set status = excluded.status, score = excluded.score, acquisition = excluded.acquisition, updated_at = now()
    where (public.grades.status, public.grades.score, public.grades.acquisition)
      is distinct from (excluded.status, excluded.score, excluded.acquisition);
end;
$$;

revoke all on function private.save_grades(uuid, uuid, uuid, timestamptz, jsonb) from public, anon;
grant execute on function private.save_grades(uuid, uuid, uuid, timestamptz, jsonb) to authenticated;

-- Renvoie « applied », « duplicate » (feuille déjà reçue) ou « stale » (une saisie plus récente existe).
create function public.submit_grades(p_operation_id uuid, p_evaluation_id uuid, p_entered_at timestamptz, p_marks jsonb)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_evaluation public.evaluations;
  v_scale public.grading_scale;
  v_locked boolean;
  -- Horloge du téléphone : jamais dans le futur.
  v_entered_at timestamptz := least(p_entered_at, now());
begin
  select * into v_evaluation from public.evaluations e where e.id = p_evaluation_id;
  if v_evaluation.id is null then
    raise exception 'unknownEvaluation' using errcode = 'P0001';
  end if;
  if not private.can_grade(v_evaluation.class_id, v_evaluation.subject_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select p.locked_at is not null into v_locked from public.periods p where p.id = v_evaluation.period_id;
  if v_locked then
    raise exception 'periodLocked' using errcode = 'P0001';
  end if;

  select cy.grading_scale into v_scale
  from public.classes c
  join public.levels l on l.id = c.level_id
  join public.cycles cy on cy.id = l.cycle_id
  where c.id = v_evaluation.class_id;
  if jsonb_typeof(p_marks) is distinct from 'object' or exists (
    select 1 from jsonb_each(p_marks) m where not private.is_valid_grade(m.value, v_scale, v_evaluation.max_score)
  ) then
    raise exception 'invalidGrade' using errcode = 'P0001';
  end if;

  if not private.claim_operation(p_operation_id, 'grades.entry') then
    return 'duplicate';
  end if;

  if v_evaluation.grades_entered_at > v_entered_at then
    return 'stale';
  end if;

  perform private.save_grades(p_evaluation_id, v_evaluation.school_id, v_evaluation.class_id, v_entered_at, p_marks);
  return 'applied';
end;
$$;

revoke all on function public.submit_grades(uuid, uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.submit_grades(uuid, uuid, timestamptz, jsonb) to authenticated;
