-- =============================================================================
-- Lot 1 — Parents et tuteurs depuis la fiche élève.
--
-- Fonctions « security invoker » (la RLS s'applique : direction et secrétariat).
-- Codes d'erreur (traduits par l'application) : unknownStudent, invalidGuardian,
-- alreadyLinked, unknownGuardian, lastGuardian, forbidden.
-- =============================================================================

-- Un seul contact principal par élève.
create unique index student_guardians_one_primary on public.student_guardians (student_id) where is_primary;

-- Ajoute un parent à l'élève ; un parent déjà connu de l'école (même numéro) est réutilisé (fratries).
-- p_guardian : { full_name, phone, relationship, is_primary }
create function public.add_student_guardian(p_school_id uuid, p_student_id uuid, p_guardian jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_guardian_id uuid;
  v_phone text := nullif(btrim(p_guardian ->> 'phone'), '');
  v_primary boolean;
begin
  if not private.can_manage_people(p_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.students s where s.id = p_student_id and s.school_id = p_school_id) then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;
  if nullif(btrim(p_guardian ->> 'full_name'), '') is null then
    raise exception 'invalidGuardian' using errcode = 'P0001';
  end if;

  if v_phone is not null then
    select g.id into v_guardian_id from public.guardians g where g.school_id = p_school_id and g.phone = v_phone;
  end if;
  if v_guardian_id is null then
    insert into public.guardians (school_id, full_name, phone, created_by)
    values (p_school_id, btrim(p_guardian ->> 'full_name'), v_phone, (select auth.uid()))
    returning id into v_guardian_id;
  end if;

  if exists (select 1 from public.student_guardians sg where sg.student_id = p_student_id and sg.guardian_id = v_guardian_id) then
    raise exception 'alreadyLinked' using errcode = 'P0001';
  end if;

  v_primary := coalesce((p_guardian ->> 'is_primary')::boolean, false)
    or not exists (select 1 from public.student_guardians sg where sg.student_id = p_student_id and sg.is_primary);
  if v_primary then
    update public.student_guardians set is_primary = false where student_id = p_student_id and is_primary;
  end if;

  insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary)
  values (
    p_school_id,
    p_student_id,
    v_guardian_id,
    coalesce(nullif(p_guardian ->> 'relationship', ''), 'guardian')::public.guardian_relationship,
    v_primary
  );
  return v_guardian_id;
end;
$$;

-- Désigne le contact principal (celui que l'école appelle en premier).
create function public.set_primary_guardian(p_school_id uuid, p_student_id uuid, p_guardian_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.can_manage_people(p_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.student_guardians sg
    where sg.school_id = p_school_id and sg.student_id = p_student_id and sg.guardian_id = p_guardian_id
  ) then
    raise exception 'unknownGuardian' using errcode = 'P0001';
  end if;

  -- En deux temps : l'index d'unicité est vérifié ligne à ligne.
  update public.student_guardians set is_primary = false
  where student_id = p_student_id and is_primary and guardian_id <> p_guardian_id;
  update public.student_guardians set is_primary = true
  where student_id = p_student_id and guardian_id = p_guardian_id;
end;
$$;

-- Retire un parent de l'élève (la fiche du parent reste, pour les frères et sœurs).
-- L'élève garde au moins un parent ; si le contact principal part, un autre prend le relais.
create function public.remove_student_guardian(p_school_id uuid, p_student_id uuid, p_guardian_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_was_primary boolean;
begin
  if not private.can_manage_people(p_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  delete from public.student_guardians sg
  where sg.school_id = p_school_id and sg.student_id = p_student_id and sg.guardian_id = p_guardian_id
  returning sg.is_primary into v_was_primary;
  if v_was_primary is null then
    raise exception 'unknownGuardian' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.student_guardians sg where sg.student_id = p_student_id) then
    raise exception 'lastGuardian' using errcode = 'P0001';
  end if;

  if v_was_primary then
    update public.student_guardians set is_primary = true
    where student_id = p_student_id
      and guardian_id = (
        select sg.guardian_id from public.student_guardians sg
        join public.guardians g on g.id = sg.guardian_id
        where sg.student_id = p_student_id
        order by (g.phone is null), sg.created_at
        limit 1
      );
  end if;
end;
$$;

revoke all on function public.add_student_guardian(uuid, uuid, jsonb) from public, anon;
revoke all on function public.set_primary_guardian(uuid, uuid, uuid) from public, anon;
revoke all on function public.remove_student_guardian(uuid, uuid, uuid) from public, anon;
grant execute on function public.add_student_guardian(uuid, uuid, jsonb) to authenticated;
grant execute on function public.set_primary_guardian(uuid, uuid, uuid) to authenticated;
grant execute on function public.remove_student_guardian(uuid, uuid, uuid) to authenticated;
