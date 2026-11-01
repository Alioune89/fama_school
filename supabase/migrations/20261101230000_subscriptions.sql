-- Abonnements des écoles : fin de la période couverte (pilote ou abonnement payé) et paiements reçus par
-- l'équipe Fama School. L'école lit sa date de fin (bandeau à venir) mais ne la modifie jamais ; les paiements
-- ne sont visibles que de l'équipe Fama School.

alter table public.schools add column subscription_ends_on date;
comment on column public.schools.subscription_ends_on is
  'Dernier jour couvert par le pilote ou l''abonnement payé (null : à définir). Écrit par la plateforme seulement.';

create type public.subscription_payment_method as enum ('wave', 'orange_money', 'transfer', 'cash', 'other');

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  amount integer not null check (amount > 0),
  method public.subscription_payment_method not null,
  paid_on date not null,
  covers_until date not null,
  reference text check (char_length(reference) <= 80),
  note text check (char_length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index subscription_payments_school_idx on public.subscription_payments (school_id, paid_on desc);
comment on table public.subscription_payments is 'Paiements d''abonnement reçus des écoles (équipe Fama School).';

alter table public.subscription_payments enable row level security;
create policy subscription_payments_platform on public.subscription_payments
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
revoke all on public.subscription_payments from anon;

-- Un paiement prolonge l'abonnement jusqu'à la fin de la période qu'il couvre (jamais en arrière).
create function private.extend_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.schools
  set subscription_ends_on = greatest(coalesce(subscription_ends_on, new.covers_until), new.covers_until)
  where id = new.school_id;
  return new;
end;
$$;
revoke all on function private.extend_subscription() from public, anon, authenticated;
create trigger subscription_payments_extend after insert on public.subscription_payments
  for each row execute function private.extend_subscription();
