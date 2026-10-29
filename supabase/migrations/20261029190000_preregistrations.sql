-- =============================================================================
-- Lot 8.3 — Pré-inscriptions depuis le site vitrine (/ecoles/<slug>/preinscription).
--
-- Un parent (anonyme) dépose une demande pour son enfant : identité, niveau souhaité, école précédente,
-- coordonnées, pièces jointes (photos ou PDF, 3 au plus). Il le fait par une seule fonction
-- (submit_preregistration), qui n'accepte que les écoles au site publié. Garde-fou : au plus 3 demandes par
-- numéro et par école sur 24 heures (code « tooManyRequests »).
-- La direction (fondateur, directeur, secrétariat) est notifiée, examine la demande, la retient ou la refuse,
-- puis inscrit l'enfant en un clic (enroll_preregistration : fiche, classe et parent en une transaction).
-- Pièces jointes : stockage privé preregistrations, rangé <école>/<fichier> ; le serveur seul y dépose
-- (adresses d'envoi signées), la direction les lit.
-- =============================================================================

create type public.preregistration_status as enum ('pending', 'accepted', 'rejected', 'enrolled');

create table public.preregistrations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  reference text not null check (reference ~ '^P\d{4}-\d{4,}$'),
  level_id uuid references public.levels (id) on delete set null,
  child_first_name text not null check (char_length(child_first_name) between 1 and 80),
  child_last_name text not null check (char_length(child_last_name) between 1 and 80),
  child_sex public.sex not null,
  child_birth_date date check (child_birth_date > date '1980-01-01'),
  previous_school text check (char_length(previous_school) <= 160),
  guardian_name text not null check (char_length(guardian_name) between 2 and 120),
  guardian_phone text not null check (guardian_phone ~ '^\+[1-9][0-9]{6,14}$'),
  guardian_relationship public.guardian_relationship not null default 'guardian',
  guardian_email text check (guardian_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text check (char_length(message) <= 1000),
  -- [{ path, name }] (3 au plus).
  attachments jsonb not null default '[]'
    check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 3),
  status public.preregistration_status not null default 'pending',
  decision_note text check (char_length(decision_note) <= 500),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  student_id uuid references public.students (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, reference)
);
create index preregistrations_school_idx on public.preregistrations (school_id, status, created_at desc);
create index preregistrations_phone_idx on public.preregistrations (school_id, guardian_phone, created_at);
comment on table public.preregistrations is 'Pré-inscriptions déposées par les parents sur le site vitrine, suivies par la direction.';

create trigger preregistrations_set_updated_at before update on public.preregistrations
  for each row execute function private.set_updated_at();

-- Une demande inscrite est close ; « inscrite » seulement avec l'élève créé (voir enroll_preregistration).
create function private.check_preregistration_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'enrolled' then
    raise exception 'alreadyEnrolled' using errcode = 'P0001';
  end if;
  if new.status = 'enrolled' and new.student_id is null then
    raise exception 'invalidValue' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status then
    new.decided_by := (select auth.uid());
    new.decided_at := now();
  end if;
  return new;
end;
$$;
create trigger preregistrations_check_update before update on public.preregistrations
  for each row execute function private.check_preregistration_update();

alter table public.preregistrations enable row level security;
create policy preregistrations_select on public.preregistrations for select to authenticated
  using (private.can_manage_people(school_id));
create policy preregistrations_update on public.preregistrations for update to authenticated
  using (private.can_manage_people(school_id)) with check (private.can_manage_people(school_id));

-- Dépôt par submit_preregistration, inscription par enroll_preregistration : la direction ne change que la décision.
revoke all on public.preregistrations from anon, authenticated;
grant select, update (status, decision_note) on public.preregistrations to authenticated;

-- Niveaux proposés sur le formulaire public (école au site publié seulement).
create function public.preregistration_levels(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'label', l.label, 'cycle', cy.label)
                            order by cy.position, l.position), '[]'::jsonb)
  from public.schools s
  join public.school_sites site on site.school_id = s.id and site.published
  join public.cycles cy on cy.school_id = s.id
  join public.levels l on l.cycle_id = cy.id
  where s.slug = p_slug;
$$;

-- Dépôt d'une demande ; renvoie sa référence (P2026-0001). Codes : unknownSchool, unknownLevel,
-- invalidAttachment, tooManyRequests, invalidValue.
create function public.submit_preregistration(p_slug text, p_data jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school public.schools;
  v_level_id uuid := private.try_uuid(p_data ->> 'level_id');
  v_phone text := btrim(p_data ->> 'guardian_phone');
  v_attachments jsonb := coalesce(p_data -> 'attachments', '[]'::jsonb);
  v_file jsonb;
  v_year integer := extract(year from current_date)::integer;
  v_id uuid;
  v_reference text;
begin
  select s.* into v_school
  from public.schools s
  join public.school_sites site on site.school_id = s.id and site.published
  where s.slug = p_slug;
  if v_school.id is null then
    raise exception 'unknownSchool' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.levels l where l.id = v_level_id and l.school_id = v_school.id) then
    raise exception 'unknownLevel' using errcode = 'P0001';
  end if;

  if jsonb_typeof(v_attachments) <> 'array' or jsonb_array_length(v_attachments) > 3 then
    raise exception 'invalidAttachment' using errcode = 'P0001';
  end if;
  for v_file in select * from jsonb_array_elements(v_attachments)
  loop
    if not (
      v_file ->> 'path' ~ ('^' || v_school.id::text || '/[0-9a-f-]{36}\.(jpg|pdf)$')
      and char_length(coalesce(v_file ->> 'name', '')) between 1 and 120
      and exists (select 1 from storage.objects o where o.bucket_id = 'preregistrations' and o.name = v_file ->> 'path')
      and not exists (
        select 1 from public.preregistrations p
        where p.school_id = v_school.id and p.attachments @> jsonb_build_array(jsonb_build_object('path', v_file ->> 'path'))
      )
    ) then
      raise exception 'invalidAttachment' using errcode = 'P0001';
    end if;
  end loop;

  if (
    select count(*) from public.preregistrations p
    where p.school_id = v_school.id and p.guardian_phone = v_phone and p.created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'tooManyRequests' using errcode = 'P0001';
  end if;

  v_reference := 'P' || v_year::text || '-' || lpad(private.next_sequence(v_school.id, 'preregistration', v_year)::text, 4, '0');
  insert into public.preregistrations (
    school_id, reference, level_id, child_first_name, child_last_name, child_sex, child_birth_date, previous_school,
    guardian_name, guardian_phone, guardian_relationship, guardian_email, message, attachments
  )
  values (
    v_school.id,
    v_reference,
    v_level_id,
    btrim(p_data ->> 'child_first_name'),
    btrim(p_data ->> 'child_last_name'),
    (p_data ->> 'child_sex')::public.sex,
    nullif(p_data ->> 'child_birth_date', '')::date,
    nullif(btrim(p_data ->> 'previous_school'), ''),
    btrim(p_data ->> 'guardian_name'),
    v_phone,
    coalesce(nullif(p_data ->> 'guardian_relationship', ''), 'guardian')::public.guardian_relationship,
    nullif(lower(btrim(p_data ->> 'guardian_email')), ''),
    nullif(btrim(p_data ->> 'message'), ''),
    (select coalesce(jsonb_agg(jsonb_build_object('path', f ->> 'path', 'name', f ->> 'name')), '[]'::jsonb)
     from jsonb_array_elements(v_attachments) f)
  )
  returning id into v_id;

  perform private.notify(
    private.role_users(v_school.id, array['owner', 'director', 'secretary']::public.app_role[]),
    v_school.id,
    'preregistration',
    jsonb_build_object(
      'child', btrim(p_data ->> 'child_first_name') || ' ' || btrim(p_data ->> 'child_last_name'),
      'level', (select l.label from public.levels l where l.id = v_level_id)
    ),
    '/direction/eleves/preinscriptions/' || v_id::text,
    'preregistration:' || v_id::text
  );
  return v_reference;
exception
  when check_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow
    or not_null_violation then
    raise exception 'invalidValue' using errcode = 'P0001';
end;
$$;

revoke all on function public.preregistration_levels(text) from public;
revoke all on function public.submit_preregistration(text, jsonb) from public;
grant execute on function public.preregistration_levels(text) to anon, authenticated;
grant execute on function public.submit_preregistration(text, jsonb) to anon, authenticated;

-- Inscription de l'enfant dans une classe de l'année en cours, avec son parent ; renvoie l'élève créé.
-- Mêmes codes que register_student, plus alreadyEnrolled.
create function public.enroll_preregistration(p_id uuid, p_class_id uuid, p_matricule text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.preregistrations;
  v_student_id uuid;
begin
  select * into v_request from public.preregistrations where id = p_id for update;
  if v_request.id is null or not private.can_manage_people(v_request.school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_request.status = 'enrolled' then
    raise exception 'alreadyEnrolled' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.classes c join public.academic_years y on y.id = c.academic_year_id
    where c.id = p_class_id and c.school_id = v_request.school_id and y.is_current
  ) then
    raise exception 'unknownClass' using errcode = 'P0001';
  end if;

  v_student_id := private.register_student_row(
    v_request.school_id,
    jsonb_build_object(
      'matricule', p_matricule,
      'first_name', v_request.child_first_name,
      'last_name', v_request.child_last_name,
      'sex', v_request.child_sex,
      'birth_date', v_request.child_birth_date
    ),
    p_class_id,
    jsonb_build_array(jsonb_build_object(
      'full_name', v_request.guardian_name,
      'phone', v_request.guardian_phone,
      'email', v_request.guardian_email,
      'relationship', v_request.guardian_relationship
    ))
  );
  update public.preregistrations set status = 'enrolled', student_id = v_student_id where id = p_id;
  return v_student_id;
end;
$$;
revoke all on function public.enroll_preregistration(uuid, uuid, text) from public;
grant execute on function public.enroll_preregistration(uuid, uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('preregistrations', 'preregistrations', false, 3145728, array['image/jpeg', 'application/pdf']);

create policy preregistrations_files_read on storage.objects
  for select to authenticated
  using (bucket_id = 'preregistrations' and private.can_manage_people(private.try_uuid((storage.foldername(name))[1])));
create policy preregistrations_files_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'preregistrations' and private.can_manage_people(private.try_uuid((storage.foldername(name))[1])));
