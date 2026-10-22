-- =============================================================================
-- Lot 2.5 (suite) — Pointage des sorties : le surveillant scanne les cartes à la sortie de l'école,
-- le parent voit « sorti à 17 h 05 ». Mêmes règles que les arrivées : une sortie par élève et par jour
-- (le premier passage compte), envoi idempotent depuis le téléphone, hors ligne compris.
-- Codes d'erreur (traduits par l'application) : forbidden, unknownStudent, dateOutOfRange.
-- =============================================================================

create table public.student_departures (
  id uuid primary key, -- identifiant de l'opération (premier scan), généré sur le téléphone
  school_id uuid not null,
  student_id uuid not null,
  date date not null,
  scanned_at timestamptz not null,
  received_at timestamptz not null default now(),
  scanned_by uuid references auth.users (id) on delete set null,
  unique (student_id, date),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index student_departures_school_date_idx on public.student_departures (school_id, date);
comment on table public.student_departures is 'Sorties pointées par QR code : une par élève et par jour (le premier passage).';

alter table public.student_departures enable row level security;

create policy student_departures_select on public.student_departures
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.is_guardian_of(student_id)
    or private.is_platform_admin()
  );

revoke insert, update, delete on public.student_departures from authenticated, anon;

-- Le premier passage compte ; renvoie true si la sortie a été enregistrée ou avancée.
create function private.insert_departure(p_id uuid, p_school_id uuid, p_student_id uuid, p_date date, p_scanned_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saved boolean;
begin
  insert into public.student_departures (id, school_id, student_id, date, scanned_at, scanned_by)
  values (p_id, p_school_id, p_student_id, p_date, p_scanned_at, (select auth.uid()))
  on conflict (student_id, date) do update
    set scanned_at = excluded.scanned_at, scanned_by = excluded.scanned_by
    where public.student_departures.scanned_at > excluded.scanned_at
  returning true into v_saved;
  return coalesce(v_saved, false);
end;
$$;

revoke all on function private.insert_departure(uuid, uuid, uuid, date, timestamptz) from public, anon;
grant execute on function private.insert_departure(uuid, uuid, uuid, date, timestamptz) to authenticated;

-- Renvoie « applied », « duplicate » (scan déjà reçu) ou « stale » (élève déjà sorti plus tôt).
create function public.record_departure(p_operation_id uuid, p_student_id uuid, p_scanned_at timestamptz)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_scanned_at timestamptz := least(p_scanned_at, now());
begin
  select s.school_id into v_school_id from public.students s where s.id = p_student_id;
  if v_school_id is null or not private.can_record_arrivals(v_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from public.enrollments e
    join public.academic_years y on y.id = e.academic_year_id
    where e.student_id = p_student_id and e.status = 'active' and y.is_current
  ) then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;
  if v_scanned_at < now() - interval '7 days' then
    raise exception 'dateOutOfRange' using errcode = 'P0001';
  end if;

  if not private.claim_operation(p_operation_id, 'checkin.departure') then
    return 'duplicate';
  end if;

  -- Dakar est à UTC toute l'année.
  if private.insert_departure(p_operation_id, v_school_id, p_student_id, (v_scanned_at at time zone 'UTC')::date, v_scanned_at) then
    return 'applied';
  end if;
  return 'stale';
end;
$$;

revoke all on function public.record_departure(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.record_departure(uuid, uuid, timestamptz) to authenticated;
