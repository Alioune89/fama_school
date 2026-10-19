-- =============================================================================
-- Lot 1 — Structure pédagogique, répertoire du personnel, élèves et familles.
--
-- « Répertoire d'abord, compte ensuite » : professeurs, personnel et parents existent
-- dans l'école dès leur saisie (affectations, liens avec les élèves). Leur compte est
-- relié à leur première connexion avec le même numéro, via les invitations du Lot 0.
--
-- Intégrité multi-écoles : les références entre tables passent par des clés composites
-- (id, school_id), si bien qu'aucune ligne ne peut pointer vers une autre école.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.cycle_code as enum ('prescolaire', 'elementaire', 'moyen', 'secondaire');
create type public.period_kind as enum ('semester', 'trimester');
create type public.grading_scale as enum ('appreciation', 'ten', 'twenty');
create type public.subject_track as enum ('french', 'arabic');
create type public.sex as enum ('F', 'M');
create type public.staff_contract as enum ('permanent', 'vacataire');
create type public.person_status as enum ('active', 'inactive');
create type public.enrollment_status as enum ('active', 'transferred', 'left', 'completed');
create type public.guardian_relationship as enum ('father', 'mother', 'guardian', 'grandparent', 'uncle', 'aunt', 'sibling', 'other');
create type public.student_document_kind as enum ('birth_certificate', 'photo', 'previous_report', 'medical', 'other');

-- -----------------------------------------------------------------------------
-- Année scolaire et périodes
-- -----------------------------------------------------------------------------
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  label text not null check (label ~ '^\d{4}-\d{4}$'),
  starts_on date not null,
  ends_on date not null,
  period_kind public.period_kind not null default 'semester',
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, label),
  unique (id, school_id),
  constraint academic_years_dates_check check (ends_on > starts_on)
);
create unique index academic_years_one_current on public.academic_years (school_id) where is_current;
comment on table public.academic_years is 'Années scolaires (octobre à juillet au Sénégal). Une seule est « en cours » par école.';

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  position smallint not null check (position between 1 and 3),
  label text not null check (char_length(label) between 2 and 40),
  starts_on date not null,
  ends_on date not null,
  locked_at timestamptz,
  locked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (academic_year_id, position),
  unique (id, school_id),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  constraint periods_dates_check check (ends_on > starts_on)
);
comment on table public.periods is 'Semestres ou trimestres. locked_at verrouille la saisie des notes (Lot 3).';

-- -----------------------------------------------------------------------------
-- Cycles, niveaux, matières
-- -----------------------------------------------------------------------------
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  code public.cycle_code not null,
  label text not null,
  grading_scale public.grading_scale not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (school_id, code),
  unique (id, school_id)
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  cycle_id uuid not null,
  code text not null check (char_length(code) between 1 and 12),
  label text not null,
  series text check (char_length(series) <= 8),
  exam text check (exam in ('CFEE', 'BFEM', 'BAC')),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (id, school_id),
  foreign key (cycle_id, school_id) references public.cycles (id, school_id) on delete cascade
);
create unique index levels_unique_code on public.levels (school_id, code, coalesce(series, ''));
comment on table public.levels is 'Niveaux (CI → CM2, 6e → 3e, 2nde → Terminale, avec série L/S au lycée).';

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  name_ar text check (char_length(name_ar) <= 80),
  short_name text check (char_length(short_name) <= 16),
  track public.subject_track not null default 'french',
  subject_group text check (char_length(subject_group) <= 40),
  position smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);
comment on column public.subjects.track is 'Filière : french ou arabic (bulletin double des écoles franco-arabes).';

create table public.level_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  level_id uuid not null,
  subject_id uuid not null,
  coefficient numeric(4, 1) not null default 1 check (coefficient > 0 and coefficient <= 20),
  weekly_hours numeric(4, 1) check (weekly_hours >= 0 and weekly_hours <= 40),
  created_at timestamptz not null default now(),
  unique (level_id, subject_id),
  foreign key (level_id, school_id) references public.levels (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade
);
comment on table public.level_subjects is 'Matières enseignées par niveau, avec leur coefficient.';

-- -----------------------------------------------------------------------------
-- Répertoire du personnel
-- -----------------------------------------------------------------------------
create table public.school_staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.app_role not null check (role not in ('parent')),
  title text check (char_length(title) <= 80),
  contract public.staff_contract,
  status public.person_status not null default 'active',
  user_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id),
  constraint school_staff_contact_check check (phone is not null or email is not null)
);
create unique index school_staff_unique_phone_role on public.school_staff (school_id, phone, role) where phone is not null;
create unique index school_staff_unique_email_role on public.school_staff (school_id, lower(email), role) where email is not null;
create index school_staff_school_role_idx on public.school_staff (school_id, role);
create index school_staff_user_idx on public.school_staff (user_id);
comment on table public.school_staff is 'Professeurs et personnel de l''école, avec ou sans compte (relié à la première connexion).';

-- -----------------------------------------------------------------------------
-- Classes et affectations
-- -----------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  level_id uuid not null,
  name text not null check (char_length(name) between 1 and 40),
  room text check (char_length(room) <= 40),
  capacity smallint check (capacity > 0 and capacity <= 200),
  homeroom_staff_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name),
  unique (id, school_id),
  unique (id, academic_year_id),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (level_id, school_id) references public.levels (id, school_id) on delete restrict,
  foreign key (homeroom_staff_id, school_id) references public.school_staff (id, school_id) on delete set null (homeroom_staff_id)
);
comment on column public.classes.homeroom_staff_id is 'Professeur principal.';

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  staff_id uuid not null,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade,
  foreign key (staff_id, school_id) references public.school_staff (id, school_id) on delete cascade
);
create index teaching_assignments_staff_idx on public.teaching_assignments (staff_id);
comment on table public.teaching_assignments is 'Qui enseigne quelle matière dans quelle classe.';

-- -----------------------------------------------------------------------------
-- Élèves et familles
-- -----------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  matricule text not null check (char_length(matricule) between 1 and 30),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  sex public.sex not null,
  birth_date date check (birth_date > date '1980-01-01'),
  birth_place text check (char_length(birth_place) <= 80),
  nationality text check (char_length(nationality) <= 40),
  photo_path text,
  address text check (char_length(address) <= 200),
  medical_notes text check (char_length(medical_notes) <= 1000),
  status public.person_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, matricule),
  unique (id, school_id)
);
create index students_school_name_idx on public.students (school_id, last_name, first_name);
comment on table public.students is 'Élèves. Le matricule est généré automatiquement s''il n''est pas saisi.';

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  class_id uuid not null,
  academic_year_id uuid not null,
  status public.enrollment_status not null default 'active',
  enrolled_on date not null default current_date,
  left_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete restrict,
  -- La classe appartient bien à l'année de l'inscription.
  foreign key (class_id, academic_year_id) references public.classes (id, academic_year_id) on delete restrict
);
create index enrollments_class_idx on public.enrollments (class_id) where status = 'active';
comment on table public.enrollments is 'Inscription d''un élève dans une classe pour une année scolaire.';

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  profession text check (char_length(profession) <= 80),
  address text check (char_length(address) <= 200),
  user_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id)
);
create unique index guardians_unique_phone on public.guardians (school_id, phone) where phone is not null;
create index guardians_user_idx on public.guardians (user_id);
comment on table public.guardians is 'Parents et tuteurs (oncle, tante, grand frère…). Compte relié à la première connexion.';

create table public.student_guardians (
  school_id uuid not null,
  student_id uuid not null,
  guardian_id uuid not null,
  relationship public.guardian_relationship not null default 'guardian',
  is_primary boolean not null default false,
  can_pay boolean not null default true,
  receives_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  foreign key (guardian_id, school_id) references public.guardians (id, school_id) on delete cascade
);
create index student_guardians_guardian_idx on public.student_guardians (guardian_id);

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  kind public.student_document_kind not null,
  file_path text not null,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text,
  size_bytes integer check (size_bytes >= 0),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index student_documents_student_idx on public.student_documents (student_id);

-- -----------------------------------------------------------------------------
-- Numérotation sans trou (matricules ; factures et reçus au Lot 4)
-- -----------------------------------------------------------------------------
create table private.document_sequences (
  school_id uuid not null references public.schools (id) on delete cascade,
  kind text not null,
  year integer not null,
  last_value integer not null default 0,
  primary key (school_id, kind, year)
);

create function private.next_sequence(p_school_id uuid, p_kind text, p_year integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into private.document_sequences as s (school_id, kind, year, last_value)
  values (p_school_id, p_kind, p_year, 1)
  on conflict (school_id, kind, year) do update set last_value = s.last_value + 1
  returning last_value;
$$;

create function private.students_default_matricule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from current_date)::integer;
begin
  if new.matricule is null or btrim(new.matricule) = '' then
    new.matricule := v_year::text || '-' || lpad(private.next_sequence(new.school_id, 'matricule', v_year)::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger students_default_matricule before insert on public.students
  for each row execute function private.students_default_matricule();

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation
-- -----------------------------------------------------------------------------
create function private.can_manage_academics(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director', 'censor']::public.app_role[]);
$$;

create function private.can_manage_people(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
      or private.has_role(p_school_id, array['owner', 'director', 'secretary']::public.app_role[]);
$$;

create function private.teaches_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teaching_assignments ta
    join public.school_staff s on s.id = ta.staff_id
    where ta.class_id = p_class_id and s.user_id = (select auth.uid()) and s.status = 'active'
  ) or exists (
    select 1
    from public.classes c
    join public.school_staff s on s.id = c.homeroom_staff_id
    where c.id = p_class_id and s.user_id = (select auth.uid()) and s.status = 'active'
  );
$$;

create function private.teaches_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.student_id = p_student_id and e.status = 'active' and private.teaches_class(e.class_id)
  );
$$;

create function private.is_guardian_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_guardians sg
    join public.guardians g on g.id = sg.guardian_id
    where sg.student_id = p_student_id and g.user_id = (select auth.uid())
  );
$$;

-- Conversion tolérante : un chemin de fichier mal formé ne doit jamais faire échouer une requête.
create function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception
  when others then return null;
end;
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function
  private.try_uuid(text),
  private.can_manage_academics(uuid),
  private.can_manage_people(uuid),
  private.teaches_class(uuid),
  private.teaches_student(uuid),
  private.is_guardian_of(uuid)
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Répertoire → invitations → comptes
-- -----------------------------------------------------------------------------

create unique index invitations_unique_pending_email
  on public.invitations (school_id, role, lower(email)) where accepted_at is null and email is not null;

-- Toute personne saisie avec un téléphone ou un e-mail reçoit une invitation ;
-- si elle a déjà un compte, le rattachement est immédiat (déclencheur du Lot 0).
create function private.invite_staff_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and new.user_id is null and (new.phone is not null or new.email is not null) then
    insert into public.invitations (school_id, role, phone, email, full_name, title, invited_by)
    values (new.school_id, new.role, new.phone, new.email, new.full_name, new.title, new.created_by)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger school_staff_invite after insert or update of phone, email, role, status on public.school_staff
  for each row execute function private.invite_staff_member();

create function private.invite_guardian()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null and new.phone is not null then
    insert into public.invitations (school_id, role, phone, email, full_name, invited_by)
    values (new.school_id, 'parent', new.phone, new.email, new.full_name, new.created_by)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger guardians_invite after insert or update of phone on public.guardians
  for each row execute function private.invite_guardian();

-- Désactiver une personne du répertoire suspend son accès (et le réactive au retour).
create function private.sync_staff_membership_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and new.status is distinct from old.status then
    update public.school_memberships
    set status = case when new.status = 'active' then 'active'::public.membership_status else 'suspended'::public.membership_status end
    where school_id = new.school_id and user_id = new.user_id and role = new.role;
  end if;
  return null;
end;
$$;

create trigger school_staff_sync_status after update of status on public.school_staff
  for each row execute function private.sync_staff_membership_status();

-- Le rattachement d'une invitation relie aussi la fiche du répertoire au compte.
create or replace function private.claim_invitations(p_user_id uuid, p_phone text, p_email text)
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

    if v_invitation.role = 'parent' then
      update public.guardians
      set user_id = p_user_id
      where school_id = v_invitation.school_id
        and user_id is null
        and ((p_phone is not null and phone = p_phone) or (p_email is not null and lower(email) = lower(p_email)));
    else
      update public.school_staff
      set user_id = p_user_id
      where school_id = v_invitation.school_id
        and role = v_invitation.role
        and user_id is null
        and ((p_phone is not null and phone = p_phone) or (p_email is not null and lower(email) = lower(p_email)));
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- updated_at et audit
-- -----------------------------------------------------------------------------
create trigger school_staff_set_updated_at before update on public.school_staff
  for each row execute function private.set_updated_at();
create trigger classes_set_updated_at before update on public.classes
  for each row execute function private.set_updated_at();
create trigger students_set_updated_at before update on public.students
  for each row execute function private.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments
  for each row execute function private.set_updated_at();
create trigger guardians_set_updated_at before update on public.guardians
  for each row execute function private.set_updated_at();

create trigger school_staff_audit after insert or update or delete on public.school_staff
  for each row execute function private.audit_row();
create trigger classes_audit after insert or update or delete on public.classes
  for each row execute function private.audit_row();
create trigger level_subjects_audit after insert or update or delete on public.level_subjects
  for each row execute function private.audit_row();
create trigger students_audit after insert or update or delete on public.students
  for each row execute function private.audit_row();
create trigger enrollments_audit after insert or update or delete on public.enrollments
  for each row execute function private.audit_row();
create trigger guardians_audit after insert or update or delete on public.guardians
  for each row execute function private.audit_row();
create trigger student_guardians_audit after insert or update or delete on public.student_guardians
  for each row execute function private.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.academic_years enable row level security;
alter table public.periods enable row level security;
alter table public.cycles enable row level security;
alter table public.levels enable row level security;
alter table public.subjects enable row level security;
alter table public.level_subjects enable row level security;
alter table public.school_staff enable row level security;
alter table public.classes enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_documents enable row level security;

-- Structure pédagogique : lisible par tous les membres de l'école, gérée par la direction des études.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['academic_years', 'periods', 'cycles', 'levels', 'subjects', 'level_subjects', 'classes', 'teaching_assignments']
  loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (private.is_member(school_id) or private.is_platform_admin())',
      v_table
    );
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (private.can_manage_academics(school_id))',
      v_table
    );
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (private.can_manage_academics(school_id)) with check (private.can_manage_academics(school_id))',
      v_table
    );
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (private.can_manage_academics(school_id))',
      v_table
    );
  end loop;
end;
$$;

-- Répertoire du personnel : la direction voit tout ; chacun voit sa propre fiche.
create policy school_staff_select on public.school_staff
  for select to authenticated
  using (private.is_staff(school_id) or user_id = (select auth.uid()) or private.is_platform_admin());

create policy school_staff_insert on public.school_staff
  for insert to authenticated
  with check (private.can_invite(school_id, role) and user_id is null);

create policy school_staff_update on public.school_staff
  for update to authenticated
  using (private.can_invite(school_id, role))
  with check (private.can_invite(school_id, role));

create policy school_staff_delete on public.school_staff
  for delete to authenticated
  using (private.can_invite(school_id, role));

-- Élèves : la direction, les professeurs de leurs classes, leurs parents.
create policy students_select on public.students
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.teaches_student(id)
    or private.is_guardian_of(id)
    or private.is_platform_admin()
  );

create policy students_insert on public.students
  for insert to authenticated
  with check (private.can_manage_people(school_id));

create policy students_update on public.students
  for update to authenticated
  using (private.can_manage_people(school_id))
  with check (private.can_manage_people(school_id));

create policy students_delete on public.students
  for delete to authenticated
  using (private.can_manage_people(school_id));

create policy enrollments_select on public.enrollments
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.teaches_class(class_id)
    or private.is_guardian_of(student_id)
    or private.is_platform_admin()
  );

create policy enrollments_insert on public.enrollments
  for insert to authenticated
  with check (private.can_manage_people(school_id));

create policy enrollments_update on public.enrollments
  for update to authenticated
  using (private.can_manage_people(school_id))
  with check (private.can_manage_people(school_id));

create policy enrollments_delete on public.enrollments
  for delete to authenticated
  using (private.can_manage_people(school_id));

-- Parents et tuteurs
create policy guardians_select on public.guardians
  for select to authenticated
  using (private.is_staff(school_id) or user_id = (select auth.uid()) or private.is_platform_admin());

create policy guardians_insert on public.guardians
  for insert to authenticated
  with check (private.can_manage_people(school_id) and user_id is null);

create policy guardians_update on public.guardians
  for update to authenticated
  using (private.can_manage_people(school_id))
  with check (private.can_manage_people(school_id));

create policy guardians_delete on public.guardians
  for delete to authenticated
  using (private.can_manage_people(school_id));

create policy student_guardians_select on public.student_guardians
  for select to authenticated
  using (
    private.is_staff(school_id)
    or exists (select 1 from public.guardians g where g.id = guardian_id and g.user_id = (select auth.uid()))
    or private.is_platform_admin()
  );

create policy student_guardians_insert on public.student_guardians
  for insert to authenticated
  with check (private.can_manage_people(school_id));

create policy student_guardians_update on public.student_guardians
  for update to authenticated
  using (private.can_manage_people(school_id))
  with check (private.can_manage_people(school_id));

create policy student_guardians_delete on public.student_guardians
  for delete to authenticated
  using (private.can_manage_people(school_id));

create policy student_documents_select on public.student_documents
  for select to authenticated
  using (private.is_staff(school_id) or private.is_guardian_of(student_id) or private.is_platform_admin());

create policy student_documents_insert on public.student_documents
  for insert to authenticated
  with check (private.can_manage_people(school_id) and uploaded_by = (select auth.uid()));

create policy student_documents_delete on public.student_documents
  for delete to authenticated
  using (private.can_manage_people(school_id));

-- Le lien vers un compte n'est jamais écrit par l'application (seulement par le rattachement).
revoke update on public.school_staff from authenticated;
grant update (full_name, phone, email, role, title, contract, status) on public.school_staff to authenticated;
revoke update on public.guardians from authenticated;
grant update (full_name, phone, email, profession, address) on public.guardians to authenticated;

-- -----------------------------------------------------------------------------
-- Stockage : logos (publics, affichés sur les bulletins et le mini-site) et documents élèves (privés)
-- Chemins : <school_id>/…
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('school-logos', 'school-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('student-documents', 'student-documents', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

create policy school_logos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-logos'
    and private.has_role(private.try_uuid((storage.foldername(name))[1]), array['owner', 'director']::public.app_role[])
  );

create policy school_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'school-logos'
    and private.has_role(private.try_uuid((storage.foldername(name))[1]), array['owner', 'director']::public.app_role[])
  );

create policy school_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-logos'
    and private.has_role(private.try_uuid((storage.foldername(name))[1]), array['owner', 'director']::public.app_role[])
  );

create policy student_documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'student-documents'
    and (
      private.is_staff(private.try_uuid((storage.foldername(name))[1]))
      or private.is_guardian_of(private.try_uuid((storage.foldername(name))[2]))
    )
  );

create policy student_documents_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-documents'
    and private.can_manage_people(private.try_uuid((storage.foldername(name))[1]))
  );

create policy student_documents_remove on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'student-documents'
    and private.can_manage_people(private.try_uuid((storage.foldername(name))[1]))
  );
