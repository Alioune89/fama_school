-- =============================================================================
-- Lot 2.4 — Justificatifs d'absence : le parent envoie un motif et une photo (mot, certificat
-- médical), la direction l'accepte ou le refuse.
--
-- Un justificatif couvre une période (du … au …) : une absence est justifiée si un justificatif
-- accepté couvre sa date. La photo est rangée dans un bucket privé : <école>/<élève>/<uuid>.<ext>.
-- Codes d'erreur (traduits par l'application) : forbidden, notFound, invalidDates, invalidComment,
-- invalidFile, missingProof, invalidDecision, invalidNote, alreadyReviewed.
-- =============================================================================

create type public.justification_reason as enum ('illness', 'medical', 'family', 'other');
create type public.justification_status as enum ('pending', 'accepted', 'refused');

create table public.absence_justifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  from_date date not null,
  to_date date not null,
  reason public.justification_reason not null,
  comment text check (char_length(comment) between 1 and 500),
  file_path text,
  mime_type text,
  status public.justification_status not null default 'pending',
  created_at timestamptz not null default now(),
  submitted_by uuid references auth.users (id) on delete set null,
  -- Noms gardés tels quels : les parents ne lisent pas le répertoire du personnel, et inversement.
  submitted_by_name text not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_by_name text,
  review_note text check (char_length(review_note) between 1 and 300),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  check (from_date <= to_date and to_date - from_date <= 14),
  check (comment is not null or file_path is not null),
  check ((status = 'pending') = (reviewed_at is null))
);
create index absence_justifications_student_idx on public.absence_justifications (student_id, from_date desc);
create index absence_justifications_school_idx on public.absence_justifications (school_id, status, created_at desc);
comment on table public.absence_justifications is 'Justificatifs d''absence envoyés par les parents, acceptés ou refusés par la direction.';

alter table public.absence_justifications enable row level security;

create policy absence_justifications_select on public.absence_justifications
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.is_guardian_of(student_id)
    or private.is_platform_admin()
  );

-- Écriture uniquement par les fonctions ci-dessous.
revoke insert, update, delete on public.absence_justifications from authenticated, anon;

-- Décision : fondateur, directeur, censeur, surveillant général (ceux qui suivent les absences).
create function private.can_review_absences(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director', 'censor', 'supervisor']::public.app_role[]);
$$;

-- Parent de l'élève, et l'élève appartient bien à cette école (chemins du stockage).
create function private.is_guardian_in_school(p_school_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_guardian_of(p_student_id)
     and exists (select 1 from public.students s where s.id = p_student_id and s.school_id = p_school_id);
$$;

revoke all on function private.can_review_absences(uuid) from public, anon;
revoke all on function private.is_guardian_in_school(uuid, uuid) from public, anon;
grant execute on function private.can_review_absences(uuid) to authenticated;
grant execute on function private.is_guardian_in_school(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Stockage : photos et PDF des justificatifs (privés, 5 Mo au plus)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('absence-justifications', 'absence-justifications', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

create policy absence_justifications_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'absence-justifications'
    and (
      private.is_staff(private.try_uuid((storage.foldername(name))[1]))
      or private.is_guardian_of(private.try_uuid((storage.foldername(name))[2]))
    )
  );

create policy absence_justifications_files_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'absence-justifications'
    and private.is_guardian_in_school(
      private.try_uuid((storage.foldername(name))[1]),
      private.try_uuid((storage.foldername(name))[2])
    )
  );

-- Le parent retire sa propre photo (envoi abandonné ou justificatif retiré).
create policy absence_justifications_files_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'absence-justifications' and owner_id = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- Envoi par le parent
-- -----------------------------------------------------------------------------
create function private.insert_absence_justification(
  p_school_id uuid,
  p_student_id uuid,
  p_from date,
  p_to date,
  p_reason public.justification_reason,
  p_comment text,
  p_file_path text,
  p_mime_type text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.absence_justifications
    (school_id, student_id, from_date, to_date, reason, comment, file_path, mime_type, submitted_by, submitted_by_name)
  values (
    p_school_id, p_student_id, p_from, p_to, p_reason, p_comment, p_file_path, p_mime_type, (select auth.uid()),
    coalesce(
      (select g.full_name from public.guardians g
       join public.student_guardians sg on sg.guardian_id = g.id
       where sg.student_id = p_student_id and g.user_id = (select auth.uid()) limit 1),
      (select p.full_name from public.profiles p where p.id = (select auth.uid())),
      ''
    )
  )
  returning id;
$$;

revoke all on function private.insert_absence_justification(uuid, uuid, date, date, public.justification_reason, text, text, text) from public, anon;
grant execute on function private.insert_absence_justification(uuid, uuid, date, date, public.justification_reason, text, text, text) to authenticated;

-- Période : au plus 30 jours en arrière, 7 jours à l'avance (absence prévue), 15 jours de suite.
create function public.submit_absence_justification(
  p_student_id uuid,
  p_from date,
  p_to date,
  p_reason public.justification_reason,
  p_comment text default null,
  p_file_path text default null,
  p_mime_type text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if not private.is_guardian_of(p_student_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select s.school_id into v_school_id from public.students s where s.id = p_student_id;
  if v_school_id is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 14
     or p_from < current_date - 30 or p_to > current_date + 7 then
    raise exception 'invalidDates' using errcode = 'P0001';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'invalidComment' using errcode = 'P0001';
  end if;
  if p_file_path is not null and (
    p_file_path !~ ('^' || v_school_id || '/' || p_student_id || '/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$')
    or p_mime_type is null
    or p_mime_type not in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')
    or not exists (
      select 1 from storage.objects o where o.bucket_id = 'absence-justifications' and o.name = p_file_path
    )
  ) then
    raise exception 'invalidFile' using errcode = 'P0001';
  end if;
  if p_file_path is null and v_comment is null then
    raise exception 'missingProof' using errcode = 'P0001';
  end if;

  return private.insert_absence_justification(
    v_school_id, p_student_id, p_from, p_to, p_reason, v_comment, p_file_path,
    case when p_file_path is null then null else p_mime_type end
  );
end;
$$;

revoke all on function public.submit_absence_justification(uuid, date, date, public.justification_reason, text, text, text) from public, anon;
grant execute on function public.submit_absence_justification(uuid, date, date, public.justification_reason, text, text, text) to authenticated;

-- Le parent retire un justificatif tant qu'il n'est pas traité. Renvoie le chemin de la photo
-- (à supprimer du stockage par l'application), ou null.
create function private.delete_absence_justification(p_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  delete from public.absence_justifications
  where id = p_id and status = 'pending' and submitted_by = (select auth.uid())
  returning coalesce(file_path, '');
$$;

revoke all on function private.delete_absence_justification(uuid) from public, anon;
grant execute on function private.delete_absence_justification(uuid) to authenticated;

create function public.withdraw_absence_justification(p_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.absence_justifications;
  v_path text;
begin
  select * into v_row from public.absence_justifications where id = p_id;
  if v_row.id is null then
    raise exception 'notFound' using errcode = 'P0001';
  end if;
  if v_row.submitted_by is distinct from (select auth.uid()) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'alreadyReviewed' using errcode = 'P0001';
  end if;
  v_path := private.delete_absence_justification(p_id);
  return nullif(v_path, '');
end;
$$;

revoke all on function public.withdraw_absence_justification(uuid) from public, anon;
grant execute on function public.withdraw_absence_justification(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Décision de la direction (modifiable : une erreur se corrige)
-- -----------------------------------------------------------------------------
create function private.set_justification_decision(
  p_id uuid,
  p_status public.justification_status,
  p_note text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.absence_justifications j
  set status = p_status,
      review_note = p_note,
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      reviewed_by_name = coalesce(
        (select st.full_name from public.school_staff st
         where st.school_id = j.school_id and st.user_id = (select auth.uid()) and st.status = 'active'
         order by (st.role <> 'teacher') desc limit 1),
        (select p.full_name from public.profiles p where p.id = (select auth.uid())),
        ''
      )
  where j.id = p_id;
$$;

revoke all on function private.set_justification_decision(uuid, public.justification_status, text) from public, anon;
grant execute on function private.set_justification_decision(uuid, public.justification_status, text) to authenticated;

create function public.review_absence_justification(
  p_id uuid,
  p_status public.justification_status,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select j.school_id into v_school_id from public.absence_justifications j where j.id = p_id;
  if v_school_id is null then
    raise exception 'notFound' using errcode = 'P0001';
  end if;
  if not private.can_review_absences(v_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_status is null or p_status = 'pending' then
    raise exception 'invalidDecision' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 300 then
    raise exception 'invalidNote' using errcode = 'P0001';
  end if;
  perform private.set_justification_decision(p_id, p_status, v_note);
end;
$$;

revoke all on function public.review_absence_justification(uuid, public.justification_status, text) from public, anon;
grant execute on function public.review_absence_justification(uuid, public.justification_status, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Résumé des absences : nombre de demi-journées couvertes par un justificatif accepté
-- -----------------------------------------------------------------------------
drop function public.attendance_absence_summary(uuid, date, date);

create function public.attendance_absence_summary(p_school_id uuid, p_from date, p_to date)
returns table (
  student_id uuid,
  first_name text,
  last_name text,
  class_name text,
  absences integer,
  lates integer,
  last_absence date,
  justified integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.student_id,
    s.first_name,
    s.last_name,
    (
      select c.name
      from public.enrollments e
      join public.classes c on c.id = e.class_id
      join public.academic_years y on y.id = e.academic_year_id
      where e.student_id = r.student_id and e.status = 'active' and y.is_current
      limit 1
    ),
    (count(*) filter (where r.status = 'absent'))::integer,
    (count(*) filter (where r.status = 'late'))::integer,
    max(r.date) filter (where r.status = 'absent'),
    (count(*) filter (
      where r.status = 'absent' and exists (
        select 1 from public.absence_justifications j
        where j.student_id = r.student_id and j.status = 'accepted' and r.date between j.from_date and j.to_date
      )
    ))::integer
  from public.attendance_records r
  join public.students s on s.id = r.student_id
  where r.school_id = p_school_id
    and r.date between p_from and p_to
    and r.status <> 'present'
  group by r.student_id, s.first_name, s.last_name;
$$;

comment on function public.attendance_absence_summary(uuid, date, date) is
  'Demi-journées d''absence (dont justifiées) et retards de chaque élève sur une période (élèves sans absence ni retard exclus).';

revoke all on function public.attendance_absence_summary(uuid, date, date) from public, anon;
grant execute on function public.attendance_absence_summary(uuid, date, date) to authenticated;
