-- =============================================================================
-- Lot 2 — Signalements : un enseignant signale un élève (comportement, santé…) avec un motif.
--
-- Le parent voit le signalement dans son espace : date, heure, classe, enseignant, type et motif.
-- Envoyé depuis le téléphone, y compris hors ligne : l'identifiant d'opération rend l'envoi idempotent.
-- Codes d'erreur (traduits par l'application) : forbidden, unknownStudent, invalidMessage.
-- =============================================================================

create type public.report_category as enum ('behavior', 'health', 'homework', 'equipment', 'other');

create table public.student_reports (
  id uuid primary key, -- identifiant de l'opération, généré sur le téléphone
  school_id uuid not null,
  student_id uuid not null,
  class_id uuid not null,
  category public.report_category not null,
  message text not null check (char_length(message) between 3 and 1000),
  -- Moment du signalement sur le téléphone, et réception par le serveur.
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  -- Nom de l'enseignant au moment du signalement (les parents ne lisent pas le répertoire du personnel).
  author_name text not null,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade
);
create index student_reports_student_idx on public.student_reports (student_id, occurred_at desc);
create index student_reports_school_idx on public.student_reports (school_id, occurred_at desc);
comment on table public.student_reports is 'Signalements d''un enseignant sur un élève, visibles par la direction et les parents.';

alter table public.student_reports enable row level security;

create policy student_reports_select on public.student_reports
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.teaches_class(class_id)
    or private.is_guardian_of(student_id)
    or private.is_platform_admin()
  );

-- Écriture uniquement par submit_student_report.
revoke insert, update, delete on public.student_reports from authenticated, anon;

create function private.insert_student_report(
  p_id uuid,
  p_school_id uuid,
  p_student_id uuid,
  p_class_id uuid,
  p_category public.report_category,
  p_message text,
  p_occurred_at timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.student_reports (id, school_id, student_id, class_id, category, message, occurred_at, created_by, author_name)
  values (
    p_id, p_school_id, p_student_id, p_class_id, p_category, p_message, p_occurred_at, (select auth.uid()),
    coalesce(
      (select st.full_name from public.school_staff st
       where st.school_id = p_school_id and st.user_id = (select auth.uid()) and st.status = 'active'
       order by (st.role = 'teacher') desc limit 1),
      (select p.full_name from public.profiles p where p.id = (select auth.uid())),
      ''
    )
  );
$$;

revoke all on function private.insert_student_report(uuid, uuid, uuid, uuid, public.report_category, text, timestamptz) from public, anon;
grant execute on function private.insert_student_report(uuid, uuid, uuid, uuid, public.report_category, text, timestamptz) to authenticated;

-- Renvoie « applied » ou « duplicate » (déjà reçu).
create function public.submit_student_report(
  p_operation_id uuid,
  p_student_id uuid,
  p_class_id uuid,
  p_category public.report_category,
  p_message text,
  p_occurred_at timestamptz
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_message text := btrim(coalesce(p_message, ''));
begin
  if not private.can_take_attendance(p_class_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select e.school_id into v_school_id
  from public.enrollments e
  join public.academic_years y on y.id = e.academic_year_id
  where e.student_id = p_student_id and e.class_id = p_class_id and e.status = 'active' and y.is_current;
  if v_school_id is null then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;
  if char_length(v_message) not between 3 and 1000 then
    raise exception 'invalidMessage' using errcode = 'P0001';
  end if;

  if not private.claim_operation(p_operation_id, 'student.report') then
    return 'duplicate';
  end if;

  perform private.insert_student_report(
    p_operation_id, v_school_id, p_student_id, p_class_id, p_category, v_message, least(p_occurred_at, now())
  );
  return 'applied';
end;
$$;

revoke all on function public.submit_student_report(uuid, uuid, uuid, public.report_category, text, timestamptz) from public, anon;
grant execute on function public.submit_student_report(uuid, uuid, uuid, public.report_category, text, timestamptz) to authenticated;

-- Les parents voient l'appel où leur enfant figure (créneau et heure de l'appel), pas les autres.
create policy attendance_sessions_select_guardian on public.attendance_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.attendance_records r
      where r.session_id = id and private.is_guardian_of(r.student_id)
    )
  );
