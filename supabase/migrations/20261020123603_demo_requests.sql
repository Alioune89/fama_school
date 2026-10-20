-- =============================================================================
-- Lot 1 — Demandes de démo depuis la page d'accueil.
--
-- Un visiteur (anonyme) peut déposer une demande ; seule l'équipe Fama School les lit et les suit.
-- Garde-fou : au plus 3 demandes par numéro sur 24 heures (code « tooManyRequests »).
-- =============================================================================

create type public.demo_request_status as enum ('new', 'contacted', 'scheduled', 'closed');

create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  school_name text not null check (char_length(school_name) between 2 and 160),
  role text not null check (role in ('founder', 'director', 'censor', 'accountant', 'other')),
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  city text check (char_length(city) <= 80),
  students_range text check (students_range in ('lt200', '200to500', '500to1000', 'gt1000')),
  message text check (char_length(message) <= 1000),
  status public.demo_request_status not null default 'new',
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index demo_requests_created_idx on public.demo_requests (created_at desc);
create index demo_requests_phone_idx on public.demo_requests (phone, created_at);
comment on table public.demo_requests is 'Demandes de démo déposées sur la page d''accueil, suivies par l''équipe Fama School.';

create trigger demo_requests_set_updated_at before update on public.demo_requests
  for each row execute function private.set_updated_at();

create function private.limit_demo_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.demo_requests d
    where d.phone = new.phone and d.created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'tooManyRequests' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger demo_requests_limit before insert on public.demo_requests
  for each row execute function private.limit_demo_requests();

alter table public.demo_requests enable row level security;

-- Dépôt public : une demande neuve, sans suivi pré-rempli.
create policy demo_requests_insert on public.demo_requests
  for insert to anon, authenticated
  with check (status = 'new' and handled_by is null);

create policy demo_requests_select on public.demo_requests
  for select to authenticated
  using (private.is_platform_admin());

create policy demo_requests_update on public.demo_requests
  for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

-- Les privilèges par défaut de Supabase donnent tout : on ne garde que ces colonnes.
revoke all on public.demo_requests from anon, authenticated;
grant insert (full_name, school_name, role, phone, email, city, students_range, message) on public.demo_requests to anon, authenticated;
grant select, update (status, handled_by) on public.demo_requests to authenticated;
