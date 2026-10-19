-- =============================================================================
-- Lot 0 — Identité, écoles, appartenances, invitations, journal d'audit.
-- Principe : chaque donnée métier porte un school_id ; la RLS s'appuie sur des
-- fonctions du schéma « private » (security definer, non exposé par l'API).
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Sécurité par défaut : rien n'est accessible sans connexion, et aucune fonction n'est
-- exécutable par tous. Chaque accès public futur (vérification de reçu, mini-site) sera accordé explicitement.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.app_role as enum (
  'owner',       -- fondateur / promoteur
  'director',    -- directeur
  'censor',      -- censeur / directeur des études
  'supervisor',  -- surveillant général
  'accountant',  -- comptable / caissier
  'secretary',   -- secrétaire
  'teacher',     -- professeur
  'parent',      -- parent ou tuteur
  'driver'       -- chauffeur (phase 2)
);

create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.school_status as enum ('trial', 'active', 'suspended', 'archived');
create type public.school_plan as enum ('pilot', 'starter', 'school', 'establishment', 'group');
create type public.app_locale as enum ('fr', 'wo');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_name text check (char_length(short_name) <= 40),
  city text,
  region text,
  address text,
  phone text,
  email text,
  logo_path text,
  country_code char(2) not null default 'SN',
  currency char(3) not null default 'XOF',
  timezone text not null default 'Africa/Dakar',
  status public.school_status not null default 'trial',
  plan public.school_plan not null default 'pilot',
  -- Modules activés (transport GPS, packs SMS…) : modifiés uniquement par la plateforme.
  features jsonb not null default '{}'::jsonb,
  -- Réglages pédagogiques et financiers (validés par zod côté application).
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.schools is 'Écoles clientes (locataires). Toutes les données métier y sont rattachées.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text unique check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text,
  avatar_path text,
  locale public.app_locale not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Profil public de chaque compte (créé automatiquement à l''inscription).';

create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  title text check (char_length(title) <= 80),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);
create index school_memberships_user_idx on public.school_memberships (user_id);
create index school_memberships_school_role_idx on public.school_memberships (school_id, role);
comment on table public.school_memberships is 'Rôles d''un compte dans une école. Un compte peut cumuler plusieurs rôles et plusieurs écoles.';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  role public.app_role not null,
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text,
  full_name text check (char_length(full_name) <= 120),
  title text check (char_length(title) <= 80),
  invited_by uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '60 days',
  created_at timestamptz not null default now(),
  constraint invitations_contact_check check (phone is not null or email is not null)
);
create index invitations_school_idx on public.invitations (school_id);
create index invitations_pending_phone_idx on public.invitations (phone) where accepted_at is null;
create index invitations_pending_email_idx on public.invitations (lower(email)) where accepted_at is null;
create unique index invitations_unique_pending_phone
  on public.invitations (school_id, role, phone) where accepted_at is null and phone is not null;
comment on table public.invitations is 'Invitations par téléphone ou e-mail ; acceptées automatiquement à la première connexion.';

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table public.platform_admins is 'Équipe Fama School (super-administrateurs).';

create table public.audit_log (
  id bigint generated always as identity primary key,
  school_id uuid references public.schools (id) on delete set null,
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_school_created_idx on public.audit_log (school_id, created_at desc);
comment on table public.audit_log is 'Qui a modifié quoi et quand (notes, paiements, inscriptions, rôles…).';

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (utilisées par la RLS)
-- -----------------------------------------------------------------------------
create function private.staff_roles()
returns public.app_role[]
language sql
immutable
set search_path = ''
as $$
  select array['owner', 'director', 'censor', 'supervisor', 'accountant', 'secretary']::public.app_role[];
$$;

create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  );
$$;

create function private.has_role(p_school_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

create function private.is_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function private.is_staff(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(p_school_id, private.staff_roles());
$$;

-- Gestion des rôles : fondateur et directeur (et l'équipe Fama School).
create function private.can_manage_members(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director']::public.app_role[]);
$$;

-- Qui peut inviter qui : le secrétariat invite professeurs, parents et chauffeurs ;
-- seul un fondateur invite un autre fondateur.
create function private.can_invite(p_school_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_platform_admin() then true
    when p_role = 'owner' then private.has_role(p_school_id, array['owner']::public.app_role[])
    when p_role in ('teacher', 'parent', 'driver') then
      private.has_role(p_school_id, array['owner', 'director', 'secretary']::public.app_role[])
    else private.has_role(p_school_id, array['owner', 'director']::public.app_role[])
  end;
$$;

-- Un membre du personnel voit le profil des comptes de son école.
create function private.can_see_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships viewer
    join public.school_memberships target on target.school_id = viewer.school_id
    where viewer.user_id = (select auth.uid())
      and viewer.status = 'active'
      and viewer.role = any (private.staff_roles())
      and target.user_id = p_user_id
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Déclencheurs utilitaires
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_set_updated_at before update on public.schools
  for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger school_memberships_set_updated_at before update on public.school_memberships
  for each row execute function private.set_updated_at();

-- Journal d'audit générique : school_id est lu dans la ligne (ou id pour la table schools).
create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_school uuid;
begin
  v_school := coalesce(
    (v_row ->> 'school_id')::uuid,
    case when tg_table_name = 'schools' then (v_row ->> 'id')::uuid end
  );
  insert into public.audit_log (school_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (
    v_school,
    (select auth.uid()),
    tg_table_name,
    v_row ->> 'id',
    tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger schools_audit after insert or update or delete on public.schools
  for each row execute function private.audit_row();
create trigger school_memberships_audit after insert or update or delete on public.school_memberships
  for each row execute function private.audit_row();
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function private.audit_row();

-- -----------------------------------------------------------------------------
-- Invitations : rattachement automatique par numéro de téléphone ou e-mail
-- -----------------------------------------------------------------------------
create function private.normalize_auth_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- auth.users stocke le numéro sans « + » (ex. 221770000001).
  select case
    when p_phone is null or btrim(p_phone) = '' then null
    when left(btrim(p_phone), 1) = '+' then btrim(p_phone)
    else '+' || btrim(p_phone)
  end;
$$;

create function private.claim_invitations(p_user_id uuid, p_phone text, p_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_count integer := 0;
begin
  for v_invitation in
    select *
    from public.invitations i
    where i.accepted_at is null
      and i.expires_at > now()
      and (
        (p_phone is not null and i.phone = p_phone)
        or (p_email is not null and lower(i.email) = lower(p_email))
      )
    for update
  loop
    insert into public.school_memberships (school_id, user_id, role, status, title, invited_by)
    values (v_invitation.school_id, p_user_id, v_invitation.role, 'active', v_invitation.title, v_invitation.invited_by)
    on conflict (school_id, user_id, role) do update set status = 'active';

    update public.invitations
    set accepted_by = p_user_id, accepted_at = now()
    where id = v_invitation.id;

    update public.profiles
    set full_name = coalesce(full_name, v_invitation.full_name)
    where id = p_user_id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := private.normalize_auth_phone(new.phone);
  v_email text := nullif(lower(new.email), '');
begin
  insert into public.profiles (id, full_name, phone, email)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), v_phone, v_email)
  on conflict (id) do nothing;

  perform private.claim_invitations(new.id, v_phone, v_email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;

create function private.handle_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := private.normalize_auth_phone(new.phone);
  v_email text := nullif(lower(new.email), '');
begin
  update public.profiles set phone = v_phone, email = v_email where id = new.id;
  perform private.claim_invitations(new.id, v_phone, v_email);
  return new;
end;
$$;

create trigger on_auth_user_contact_changed
  after update of phone, email on auth.users
  for each row
  when (old.phone is distinct from new.phone or old.email is distinct from new.email)
  execute function private.handle_user_contact_change();

grant execute on function private.handle_user_contact_change() to supabase_auth_admin;

-- Invitation envoyée à quelqu'un qui a déjà un compte : rattachement immédiat.
create function private.handle_new_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select p.id into v_user_id
  from public.profiles p
  where (new.phone is not null and p.phone = new.phone)
     or (new.email is not null and lower(p.email) = lower(new.email))
  limit 1;

  if v_user_id is not null then
    perform private.claim_invitations(
      v_user_id,
      (select phone from public.profiles where id = v_user_id),
      (select email from public.profiles where id = v_user_id)
    );
  end if;
  return null;
end;
$$;

create trigger on_invitation_created
  after insert on public.invitations
  for each row execute function private.handle_new_invitation();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_log enable row level security;

-- Écoles
create policy schools_select on public.schools
  for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());

create policy schools_update on public.schools
  for update to authenticated
  using (private.can_manage_members(id))
  with check (private.can_manage_members(id));

-- La création et la suppression d'écoles passent par la plateforme (clé de service).
-- La formule, le statut et les modules ne sont jamais modifiables par l'école elle-même.
revoke update on public.schools from authenticated;
grant update (name, short_name, city, region, address, phone, email, logo_path, timezone, settings)
  on public.schools to authenticated;

-- Profils
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_platform_admin()
    or private.can_see_profile(id)
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Le téléphone et l'e-mail suivent le compte d'authentification, jamais une saisie directe.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_path, locale) on public.profiles to authenticated;

-- Appartenances
create policy school_memberships_select on public.school_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_staff(school_id)
    or private.is_platform_admin()
  );

create policy school_memberships_insert on public.school_memberships
  for insert to authenticated
  with check (private.can_manage_members(school_id));

create policy school_memberships_update on public.school_memberships
  for update to authenticated
  using (private.can_manage_members(school_id))
  with check (private.can_manage_members(school_id));

create policy school_memberships_delete on public.school_memberships
  for delete to authenticated
  using (private.can_manage_members(school_id));

-- Invitations
create policy invitations_select on public.invitations
  for select to authenticated
  using (private.is_staff(school_id) or private.is_platform_admin());

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    private.can_invite(school_id, role)
    and invited_by = (select auth.uid())
    and accepted_at is null
    and accepted_by is null
  );

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (private.can_invite(school_id, role) and accepted_at is null);

-- Administrateurs de la plateforme : chacun peut seulement savoir s'il l'est.
create policy platform_admins_select_self on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Journal d'audit : lecture par la direction, écriture uniquement par les déclencheurs.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (
    private.is_platform_admin()
    or (school_id is not null and private.has_role(school_id, array['owner', 'director']::public.app_role[]))
  );

-- Aucune donnée n'est accessible sans connexion.
revoke all on all tables in schema public from anon;
