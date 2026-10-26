-- =============================================================================
-- Lot 4.1 — Grille des frais : types de frais de l'école, montant par niveau et par année,
-- nombre de mensualités, options choisies par élève (cantine, transport) et réductions (fratrie, bourse).
--
-- Écrit par le fondateur, le directeur et le comptable (private.can_manage_finance) ; la grille se lit par
-- tous les membres de l'école ; options et réductions d'un élève, par le personnel et ses parents.
-- Montants en francs CFA, entiers.
-- =============================================================================

create function private.can_manage_finance(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director', 'accountant']::public.app_role[]);
$$;

revoke all on function private.can_manage_finance(uuid) from public, anon;
grant execute on function private.can_manage_finance(uuid) to authenticated;

create type public.fee_kind as enum ('registration', 'tuition', 'canteen', 'transport', 'uniform', 'parents_association', 'exam', 'other');
create type public.fee_frequency as enum ('once', 'monthly');

create table public.fee_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  kind public.fee_kind not null,
  frequency public.fee_frequency not null,
  -- Facturé seulement aux élèves qui l'ont choisi (cantine, transport).
  optional boolean not null default false,
  position smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);
comment on table public.fee_types is 'Types de frais de l''école : inscription, mensualité, cantine, transport, tenue, APE…';

create table public.fee_rates (
  school_id uuid not null,
  academic_year_id uuid not null,
  level_id uuid not null,
  fee_type_id uuid not null,
  amount integer not null check (amount between 0 and 10000000),
  updated_at timestamptz not null default now(),
  primary key (academic_year_id, level_id, fee_type_id),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (level_id, school_id) references public.levels (id, school_id) on delete cascade,
  foreign key (fee_type_id, school_id) references public.fee_types (id, school_id) on delete cascade
);
comment on table public.fee_rates is 'Montant d''un type de frais pour un niveau et une année (par mois pour les frais mensuels).';

-- Mensualités de l'année : nombre et premier mois (par défaut 9, à partir du mois de la rentrée).
create table public.billing_schedules (
  academic_year_id uuid primary key,
  school_id uuid not null,
  installments smallint not null default 9 check (installments between 1 and 12),
  first_month date not null check (extract(day from first_month) = 1),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade
);
comment on table public.billing_schedules is 'Calendrier des mensualités d''une année : nombre et premier mois facturé.';

create table public.student_fee_options (
  school_id uuid not null,
  academic_year_id uuid not null,
  student_id uuid not null,
  fee_type_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (academic_year_id, student_id, fee_type_id),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (fee_type_id, school_id) references public.fee_types (id, school_id) on delete cascade
);
comment on table public.student_fee_options is 'Frais optionnels (cantine, transport) choisis pour un élève sur une année.';

create type public.discount_kind as enum ('sibling', 'scholarship', 'staff', 'other');

create table public.student_discounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  student_id uuid not null,
  kind public.discount_kind not null,
  label text check (char_length(label) <= 80),
  percent numeric(5, 2) not null check (percent > 0 and percent <= 100),
  -- Frais concerné ; null : toutes les mensualités.
  fee_type_id uuid,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (fee_type_id, school_id) references public.fee_types (id, school_id) on delete cascade
);
create unique index student_discounts_one_per_fee on public.student_discounts
  (academic_year_id, student_id, coalesce(fee_type_id, '00000000-0000-0000-0000-000000000000'::uuid));
comment on table public.student_discounts is 'Réductions d''un élève sur une année (pourcentage), sur un frais ou sur toutes les mensualités.';

-- Une option porte sur un frais optionnel.
create function private.check_fee_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.fee_types f where f.id = new.fee_type_id and f.optional) then
    raise exception 'feeNotOptional' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger student_fee_options_check before insert or update on public.student_fee_options
  for each row execute function private.check_fee_option();

alter table public.fee_types enable row level security;
alter table public.fee_rates enable row level security;
alter table public.billing_schedules enable row level security;
alter table public.student_fee_options enable row level security;
alter table public.student_discounts enable row level security;

create policy fee_types_select on public.fee_types for select to authenticated
  using (private.is_member(school_id) or private.is_platform_admin());
create policy fee_rates_select on public.fee_rates for select to authenticated
  using (private.is_member(school_id) or private.is_platform_admin());
create policy billing_schedules_select on public.billing_schedules for select to authenticated
  using (private.is_member(school_id) or private.is_platform_admin());
create policy student_fee_options_select on public.student_fee_options for select to authenticated
  using (private.is_staff(school_id) or private.is_guardian_of(student_id) or private.is_platform_admin());
create policy student_discounts_select on public.student_discounts for select to authenticated
  using (private.is_staff(school_id) or private.is_guardian_of(student_id) or private.is_platform_admin());

do $$
declare
  v_table text;
begin
  foreach v_table in array array['fee_types', 'fee_rates', 'billing_schedules', 'student_fee_options', 'student_discounts']
  loop
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (private.can_manage_finance(school_id))',
      v_table);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (private.can_manage_finance(school_id)) with check (private.can_manage_finance(school_id))',
      v_table);
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (private.can_manage_finance(school_id))',
      v_table);
  end loop;
end;
$$;
