-- =============================================================================
-- Lot 2 — Présence : appel des professeurs, envoyé depuis le téléphone (y compris hors ligne).
--
-- Un appel = une classe, un jour, un créneau (matin ou après-midi). Tout le monde est présent
-- par défaut ; le professeur marque les absents et les retards.
--
-- Les opérations hors ligne portent un identifiant généré sur le téléphone : une opération
-- renvoyée deux fois (réseau coupé avant la réponse) n'est appliquée qu'une fois.
-- Codes d'erreur (traduits par l'application) : forbidden, unknownClass, dateOutOfRange.
-- =============================================================================

create type public.attendance_status as enum ('present', 'absent', 'late');
create type public.attendance_slot as enum ('morning', 'afternoon');

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  date date not null,
  slot public.attendance_slot not null,
  taken_by uuid references auth.users (id) on delete set null,
  -- Heure de l'appel sur le téléphone (il peut arriver au serveur bien plus tard).
  taken_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, date, slot),
  unique (id, school_id, class_id, date),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade
);
create index attendance_sessions_school_date_idx on public.attendance_sessions (school_id, date);
comment on table public.attendance_sessions is 'Appels faits : une classe, un jour, un créneau.';

create table public.attendance_records (
  session_id uuid not null,
  school_id uuid not null,
  class_id uuid not null,
  date date not null,
  student_id uuid not null,
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id),
  foreign key (session_id, school_id, class_id, date)
    references public.attendance_sessions (id, school_id, class_id, date) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index attendance_records_student_date_idx on public.attendance_records (student_id, date);
create index attendance_records_school_date_idx on public.attendance_records (school_id, date) where status <> 'present';
comment on table public.attendance_records is 'Présence de chaque élève à un appel (classe et date recopiées pour les tableaux de la direction).';

create trigger attendance_sessions_updated_at before update on public.attendance_sessions
  for each row execute function private.set_updated_at();
create trigger attendance_records_updated_at before update on public.attendance_records
  for each row execute function private.set_updated_at();
create trigger attendance_sessions_audit after insert or update or delete on public.attendance_sessions
  for each row execute function private.audit_row();

-- -----------------------------------------------------------------------------
-- Opérations hors ligne déjà appliquées (idempotence)
-- -----------------------------------------------------------------------------
create table private.applied_operations (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,
  applied_at timestamptz not null default now()
);
comment on table private.applied_operations is 'Identifiants des opérations envoyées par les téléphones, pour ne jamais les appliquer deux fois.';

-- Réserve l'identifiant d'une opération : faux si elle a déjà été appliquée.
-- Appelée dans la transaction de l'opération : si celle-ci échoue, la réservation est annulée.
create function private.claim_operation(p_operation_id uuid, p_kind text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    insert into private.applied_operations (id, user_id, kind)
    values (p_operation_id, (select auth.uid()), p_kind)
    on conflict (id) do nothing
    returning 1
  )
  select exists (select 1 from claimed);
$$;

-- -----------------------------------------------------------------------------
-- Droits : la direction, le censeur, le surveillant général, et les professeurs de la classe.
-- -----------------------------------------------------------------------------
create function private.can_take_attendance(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.teaches_class(p_class_id)
      or exists (
        select 1
        from public.classes c
        where c.id = p_class_id
          and private.has_role(c.school_id, array['owner', 'director', 'censor', 'supervisor']::public.app_role[])
      );
$$;

revoke all on function private.claim_operation(uuid, text) from public, anon;
revoke all on function private.can_take_attendance(uuid) from public, anon;
grant execute on function private.claim_operation(uuid, text) to authenticated;
grant execute on function private.can_take_attendance(uuid) to authenticated;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy attendance_sessions_select on public.attendance_sessions
  for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_platform_admin());

create policy attendance_sessions_insert on public.attendance_sessions
  for insert to authenticated
  with check (private.can_take_attendance(class_id));

create policy attendance_sessions_update on public.attendance_sessions
  for update to authenticated
  using (private.can_take_attendance(class_id))
  with check (private.can_take_attendance(class_id));

-- Les parents voient la présence de leurs enfants (pas l'appel du reste de la classe).
create policy attendance_records_select on public.attendance_records
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.teaches_class(class_id)
    or private.is_guardian_of(student_id)
    or private.is_platform_admin()
  );

create policy attendance_records_insert on public.attendance_records
  for insert to authenticated
  with check (private.can_take_attendance(class_id));

create policy attendance_records_update on public.attendance_records
  for update to authenticated
  using (private.can_take_attendance(class_id))
  with check (private.can_take_attendance(class_id));

-- -----------------------------------------------------------------------------
-- Envoi d'un appel
-- -----------------------------------------------------------------------------
-- p_marks : { "<student_id>": "present" | "absent" | "late", … } — tout l'appel, pas une différence.
-- Le dernier appel fait sur un téléphone l'emporte (heure de l'appel, pas heure d'arrivée) :
-- un appel ancien qui arrive en retard ne remplace pas une correction plus récente.
-- Les élèves qui ont quitté la classe entre-temps sont ignorés.
-- Renvoie « applied », « duplicate » (déjà reçu) ou « stale » (un appel plus récent existe).
create function public.submit_roll_call(
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
    return 'stale';
  end if;

  if v_session_id is null then
    insert into public.attendance_sessions (school_id, class_id, date, slot, taken_by, taken_at)
    values (v_school_id, p_class_id, p_date, p_slot, (select auth.uid()), v_taken_at)
    returning id into v_session_id;
  else
    update public.attendance_sessions
    set taken_by = (select auth.uid()), taken_at = v_taken_at
    where id = v_session_id;
  end if;

  insert into public.attendance_records (session_id, school_id, class_id, date, student_id, status)
  select v_session_id, v_school_id, p_class_id, p_date, e.student_id, m.value::public.attendance_status
  from jsonb_each_text(p_marks) m
  join public.enrollments e
    on e.student_id = private.try_uuid(m.key) and e.class_id = p_class_id and e.status = 'active'
  on conflict (session_id, student_id) do update set status = excluded.status
  where public.attendance_records.status is distinct from excluded.status;

  return 'applied';
end;
$$;

comment on function public.submit_roll_call(uuid, uuid, date, public.attendance_slot, timestamptz, jsonb) is
  'Enregistre un appel (idempotent par identifiant d''opération, le plus récent l''emporte).';

revoke all on function public.submit_roll_call(uuid, uuid, date, public.attendance_slot, timestamptz, jsonb) from public, anon;
grant execute on function public.submit_roll_call(uuid, uuid, date, public.attendance_slot, timestamptz, jsonb) to authenticated;
