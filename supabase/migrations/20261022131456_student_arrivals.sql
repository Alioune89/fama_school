-- =============================================================================
-- Lot 2.5 — Pointage des arrivées par QR code.
--
-- Chaque élève a une carte avec un QR code : un jeton aléatoire (students.badge_token), qui ne
-- révèle rien de l'élève et se renouvelle si la carte est perdue. Le surveillant scanne les cartes
-- à l'entrée, y compris hors ligne : l'identifiant d'opération rend l'envoi idempotent.
-- Une arrivée par élève et par jour : le premier passage compte. Le parent voit l'heure d'arrivée.
-- Codes d'erreur (traduits par l'application) : forbidden, unknownStudent, dateOutOfRange.
-- =============================================================================

alter table public.students
  add column badge_token text not null default replace(gen_random_uuid()::text, '-', '')
    check (badge_token ~ '^[0-9a-f]{32}$');
create unique index students_badge_token_key on public.students (badge_token);
comment on column public.students.badge_token is 'Jeton du QR code de la carte d''élève (renouvelé si la carte est perdue).';

create table public.student_arrivals (
  id uuid primary key, -- identifiant de l'opération (premier scan), généré sur le téléphone
  school_id uuid not null,
  student_id uuid not null,
  date date not null,
  -- Heure du scan sur le téléphone (plafonnée à la réception), et réception par le serveur.
  scanned_at timestamptz not null,
  received_at timestamptz not null default now(),
  scanned_by uuid references auth.users (id) on delete set null,
  unique (student_id, date),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index student_arrivals_school_date_idx on public.student_arrivals (school_id, date);
comment on table public.student_arrivals is 'Arrivées pointées par QR code : une par élève et par jour (le premier passage).';

alter table public.student_arrivals enable row level security;

create policy student_arrivals_select on public.student_arrivals
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.is_guardian_of(student_id)
    or private.is_platform_admin()
  );

-- Écriture uniquement par record_arrival.
revoke insert, update, delete on public.student_arrivals from authenticated, anon;

-- Pointage : fondateur, directeur, censeur, surveillant général.
create function private.can_record_arrivals(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(p_school_id, array['owner', 'director', 'censor', 'supervisor']::public.app_role[]);
$$;

-- Le premier passage de la journée compte : un scan plus ancien reçu plus tard remplace l'heure.
-- Renvoie true si l'arrivée a été enregistrée ou avancée, false si l'élève était déjà arrivé plus tôt.
create function private.insert_arrival(p_id uuid, p_school_id uuid, p_student_id uuid, p_date date, p_scanned_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted boolean;
begin
  insert into public.student_arrivals (id, school_id, student_id, date, scanned_at, scanned_by)
  values (p_id, p_school_id, p_student_id, p_date, p_scanned_at, (select auth.uid()))
  on conflict (student_id, date) do update
    set scanned_at = excluded.scanned_at, scanned_by = excluded.scanned_by
    where public.student_arrivals.scanned_at > excluded.scanned_at
  returning true into v_inserted;
  return coalesce(v_inserted, false);
end;
$$;

revoke all on function private.can_record_arrivals(uuid) from public, anon;
revoke all on function private.insert_arrival(uuid, uuid, uuid, date, timestamptz) from public, anon;
grant execute on function private.can_record_arrivals(uuid) to authenticated;
grant execute on function private.insert_arrival(uuid, uuid, uuid, date, timestamptz) to authenticated;

-- Renvoie « applied » (nouvelle arrivée), « duplicate » (scan déjà reçu) ou « stale » (élève déjà arrivé plus tôt).
create function public.record_arrival(p_operation_id uuid, p_student_id uuid, p_scanned_at timestamptz)
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

  if not private.claim_operation(p_operation_id, 'checkin.arrival') then
    return 'duplicate';
  end if;

  -- Dakar est à UTC toute l'année.
  if private.insert_arrival(p_operation_id, v_school_id, p_student_id, (v_scanned_at at time zone 'UTC')::date, v_scanned_at) then
    return 'applied';
  end if;
  return 'stale';
end;
$$;

revoke all on function public.record_arrival(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.record_arrival(uuid, uuid, timestamptz) to authenticated;

-- Carte perdue : nouveau jeton, l'ancienne carte ne fonctionne plus.
create function public.renew_student_badge(p_student_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.students
  set badge_token = replace(gen_random_uuid()::text, '-', '')
  where id = p_student_id and private.can_manage_people(school_id);
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.renew_student_badge(uuid) from public, anon;
grant execute on function public.renew_student_badge(uuid) to authenticated;
