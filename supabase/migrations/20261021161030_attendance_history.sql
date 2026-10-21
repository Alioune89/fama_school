-- =============================================================================
-- Lot 2 — Traçabilité des appels : chaque envoi est conservé, avec ses changements.
--
-- attendance_sessions ne garde que le dernier état de l'appel. Le journal garde chaque envoi :
-- qui, quand (heure sur le téléphone et heure de réception), et quels élèves ont changé de statut.
-- Il n'est écrit que par submit_roll_call (aucune écriture directe depuis l'application).
-- =============================================================================

create table public.attendance_submissions (
  id uuid primary key, -- identifiant de l'opération, généré sur le téléphone
  school_id uuid not null,
  class_id uuid not null,
  date date not null,
  slot public.attendance_slot not null,
  session_id uuid references public.attendance_sessions (id) on delete cascade,
  submitted_by uuid references auth.users (id) on delete set null,
  -- Heure de l'appel sur le téléphone, et heure de réception (écart = appel fait hors ligne).
  taken_at timestamptz not null,
  received_at timestamptz not null default now(),
  -- applied : enregistré ; stale : ignoré, un appel plus récent existait déjà.
  outcome text not null check (outcome in ('applied', 'stale')),
  is_first boolean not null default false,
  absent_count integer not null default 0,
  late_count integer not null default 0,
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade
);
create index attendance_submissions_school_date_idx on public.attendance_submissions (school_id, date, received_at desc);
comment on table public.attendance_submissions is 'Journal des appels : chaque envoi d''un appel, premier appel ou correction.';

create table public.attendance_changes (
  submission_id uuid not null references public.attendance_submissions (id) on delete cascade,
  school_id uuid not null,
  student_id uuid not null,
  -- null au premier appel (l'élève était présent par défaut).
  previous_status public.attendance_status,
  new_status public.attendance_status not null,
  primary key (submission_id, student_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index attendance_changes_student_idx on public.attendance_changes (student_id);
comment on table public.attendance_changes is 'Élèves dont le statut a changé à un envoi (absents et retards au premier appel).';

alter table public.attendance_submissions enable row level security;
alter table public.attendance_changes enable row level security;

-- Lecture : l'équipe de direction (et l'enseignant pour ses classes). Aucune écriture directe.
create policy attendance_submissions_select on public.attendance_submissions
  for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_platform_admin());

create policy attendance_changes_select on public.attendance_changes
  for select to authenticated
  using (
    exists (
      select 1 from public.attendance_submissions s
      where s.id = submission_id
        and (private.is_staff(s.school_id) or private.teaches_class(s.class_id) or private.is_platform_admin())
    )
  );

revoke insert, update, delete on public.attendance_submissions, public.attendance_changes from authenticated, anon;

-- Écriture du journal (appelée par submit_roll_call uniquement : le schéma private n'est pas exposé par l'API).
create function private.log_roll_call(
  p_submission_id uuid,
  p_school_id uuid,
  p_class_id uuid,
  p_date date,
  p_slot public.attendance_slot,
  p_session_id uuid,
  p_taken_at timestamptz,
  p_outcome text,
  p_is_first boolean,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.attendance_submissions
    (id, school_id, class_id, date, slot, session_id, submitted_by, taken_at, outcome, is_first, absent_count, late_count)
  values (
    p_submission_id, p_school_id, p_class_id, p_date, p_slot, p_session_id, (select auth.uid()), p_taken_at, p_outcome, p_is_first,
    coalesce((select count(*) from public.attendance_records r where r.session_id = p_session_id and r.status = 'absent'), 0),
    coalesce((select count(*) from public.attendance_records r where r.session_id = p_session_id and r.status = 'late'), 0)
  );

  insert into public.attendance_changes (submission_id, school_id, student_id, previous_status, new_status)
  select p_submission_id, p_school_id, (c ->> 'student_id')::uuid,
         (c ->> 'previous')::public.attendance_status, (c ->> 'next')::public.attendance_status
  from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb)) c;
end;
$$;

revoke all on function private.log_roll_call(uuid, uuid, uuid, date, public.attendance_slot, uuid, timestamptz, text, boolean, jsonb) from public, anon;
grant execute on function private.log_roll_call(uuid, uuid, uuid, date, public.attendance_slot, uuid, timestamptz, text, boolean, jsonb) to authenticated;

-- submit_roll_call : même comportement, plus l'écriture du journal.
create or replace function public.submit_roll_call(
  p_operation_id uuid,
  p_class_id uuid,
  p_date date,
  p_slot public.attendance_slot,
  p_taken_at timestamptz,
  p_marks jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_session_id uuid;
  v_existing_taken_at timestamptz;
  v_is_first boolean;
  v_changes jsonb;
  -- Horloge du téléphone : jamais dans le futur.
  v_taken_at timestamptz := least(p_taken_at, now());
begin
  select c.school_id into v_school_id
  from public.classes c
  join public.academic_years y on y.id = c.academic_year_id
  where c.id = p_class_id and y.is_current;
  if v_school_id is null then
    raise exception 'unknownClass' using errcode = 'P0001';
  end if;
  if not private.can_take_attendance(p_class_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  -- Une semaine de rattrapage au plus (téléphone resté hors ligne) ; jamais de jour futur.
  if p_date > (now() at time zone 'Africa/Dakar')::date or p_date < (now() at time zone 'Africa/Dakar')::date - 7 then
    raise exception 'dateOutOfRange' using errcode = 'P0001';
  end if;

  if not private.claim_operation(p_operation_id, 'attendance.rollCall') then
    return 'duplicate';
  end if;

  select s.id, s.taken_at into v_session_id, v_existing_taken_at
  from public.attendance_sessions s
  where s.class_id = p_class_id and s.date = p_date and s.slot = p_slot
  for update;

  if v_session_id is not null and v_existing_taken_at > v_taken_at then
    perform private.log_roll_call(p_operation_id, v_school_id, p_class_id, p_date, p_slot, v_session_id, v_taken_at, 'stale', false, null);
    return 'stale';
  end if;

  v_is_first := v_session_id is null;
  if v_is_first then
    insert into public.attendance_sessions (school_id, class_id, date, slot, taken_by, taken_at)
    values (v_school_id, p_class_id, p_date, p_slot, (select auth.uid()), v_taken_at)
    returning id into v_session_id;
  else
    update public.attendance_sessions
    set taken_by = (select auth.uid()), taken_at = v_taken_at
    where id = v_session_id;
  end if;

  -- Changements par rapport à l'appel enregistré (au premier appel : absents et retards).
  select jsonb_agg(jsonb_build_object('student_id', m.student_id, 'previous', r.status, 'next', m.status))
  into v_changes
  from (
    select e.student_id, mk.value::public.attendance_status as status
    from jsonb_each_text(p_marks) mk
    join public.enrollments e
      on e.student_id = private.try_uuid(mk.key) and e.class_id = p_class_id and e.status = 'active'
  ) m
  left join public.attendance_records r on r.session_id = v_session_id and r.student_id = m.student_id
  where r.status is distinct from m.status and not (r.status is null and m.status = 'present');

  insert into public.attendance_records (session_id, school_id, class_id, date, student_id, status)
  select v_session_id, v_school_id, p_class_id, p_date, e.student_id, m.value::public.attendance_status
  from jsonb_each_text(p_marks) m
  join public.enrollments e
    on e.student_id = private.try_uuid(m.key) and e.class_id = p_class_id and e.status = 'active'
  on conflict (session_id, student_id) do update set status = excluded.status
  where public.attendance_records.status is distinct from excluded.status;

  perform private.log_roll_call(p_operation_id, v_school_id, p_class_id, p_date, p_slot, v_session_id, v_taken_at, 'applied', v_is_first, v_changes);
  return 'applied';
end;
$$;
