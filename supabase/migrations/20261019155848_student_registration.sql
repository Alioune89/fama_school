-- =============================================================================
-- Lot 1 — Inscription des élèves (unitaire et import en masse).
--
-- Tout se fait en une transaction : élève, inscription dans la classe, parents (réutilisés
-- s'ils existent déjà avec le même numéro dans l'école) et liens. Fonctions « security invoker » :
-- la RLS s'applique, seuls la direction et le secrétariat peuvent inscrire.
--
-- Codes d'erreur renvoyés (traduits par l'application) : unknownClass, duplicateMatricule,
-- invalidValue, invalidGuardian, forbidden.
-- =============================================================================

create function private.register_student_row(
  p_school_id uuid,
  p_student jsonb,
  p_class_id uuid,
  p_guardians jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_year_id uuid;
  v_student_id uuid;
  v_guardian jsonb;
  v_guardian_id uuid;
  v_phone text;
  v_has_primary boolean := false;
begin
  select c.academic_year_id into v_year_id
  from public.classes c
  where c.id = p_class_id and c.school_id = p_school_id;
  if v_year_id is null then
    raise exception 'unknownClass' using errcode = 'P0001';
  end if;

  insert into public.students (
    school_id, matricule, first_name, last_name, sex, birth_date, birth_place, nationality, address, medical_notes, created_by
  )
  values (
    p_school_id,
    nullif(btrim(p_student ->> 'matricule'), ''),
    btrim(p_student ->> 'first_name'),
    btrim(p_student ->> 'last_name'),
    (p_student ->> 'sex')::public.sex,
    nullif(p_student ->> 'birth_date', '')::date,
    nullif(btrim(p_student ->> 'birth_place'), ''),
    nullif(btrim(p_student ->> 'nationality'), ''),
    nullif(btrim(p_student ->> 'address'), ''),
    nullif(btrim(p_student ->> 'medical_notes'), ''),
    (select auth.uid())
  )
  returning id into v_student_id;

  insert into public.enrollments (school_id, student_id, class_id, academic_year_id)
  values (p_school_id, v_student_id, p_class_id, v_year_id);

  for v_guardian in select * from jsonb_array_elements(coalesce(p_guardians, '[]'::jsonb))
  loop
    v_phone := nullif(btrim(v_guardian ->> 'phone'), '');
    if nullif(btrim(v_guardian ->> 'full_name'), '') is null then
      raise exception 'invalidGuardian' using errcode = 'P0001';
    end if;

    v_guardian_id := null;
    if v_phone is not null then
      select g.id into v_guardian_id from public.guardians g where g.school_id = p_school_id and g.phone = v_phone;
    end if;

    if v_guardian_id is null then
      insert into public.guardians (school_id, full_name, phone, email, profession, created_by)
      values (
        p_school_id,
        btrim(v_guardian ->> 'full_name'),
        v_phone,
        nullif(lower(btrim(v_guardian ->> 'email')), ''),
        nullif(btrim(v_guardian ->> 'profession'), ''),
        (select auth.uid())
      )
      returning id into v_guardian_id;
    end if;

    insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary)
    values (
      p_school_id,
      v_student_id,
      v_guardian_id,
      coalesce(nullif(v_guardian ->> 'relationship', ''), 'guardian')::public.guardian_relationship,
      not v_has_primary
    )
    on conflict (student_id, guardian_id) do nothing;
    v_has_primary := true;
  end loop;

  return v_student_id;
end;
$$;

/** Code d'erreur applicatif à partir d'une erreur SQL. */
create function private.registration_error_code(p_sqlstate text, p_message text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_sqlstate = 'P0001' then p_message
    when p_sqlstate = '23505' then 'duplicateMatricule'
    when p_sqlstate = '42501' then 'forbidden'
    when p_sqlstate in ('23514', '22P02', '22007', '22008', '23502') then 'invalidValue'
    else 'unknown'
  end;
$$;

-- Inscription d'un élève : renvoie son identifiant (ou une erreur traduite par l'application).
create function public.register_student(p_school_id uuid, p_student jsonb, p_class_id uuid, p_guardians jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.register_student_row(p_school_id, p_student, p_class_id, p_guardians);
end;
$$;

-- Import en masse : chaque ligne est isolée (sous-transaction) ; renvoie le nombre importé et les erreurs.
-- p_rows : [{ "row": 12, "class_name": "6e A", "student": {...}, "guardians": [...] }]
create function public.import_students(p_school_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_year_id uuid;
  v_row jsonb;
  v_class_id uuid;
  v_imported integer := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  select y.id into v_year_id from public.academic_years y where y.school_id = p_school_id and y.is_current;
  if v_year_id is null then
    raise exception 'noYear' using errcode = 'P0001';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    begin
      select c.id into v_class_id
      from public.classes c
      where c.academic_year_id = v_year_id
        and lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(v_row ->> 'class_name'), '\s+', ' ', 'g'));
      if v_class_id is null then
        raise exception 'unknownClass' using errcode = 'P0001';
      end if;

      perform private.register_student_row(p_school_id, v_row -> 'student', v_class_id, v_row -> 'guardians');
      v_imported := v_imported + 1;
    exception
      when others then
        v_errors := v_errors || jsonb_build_object(
          'row', v_row -> 'row',
          'code', private.registration_error_code(sqlstate, sqlerrm)
        );
    end;
  end loop;

  return jsonb_build_object('imported', v_imported, 'errors', v_errors);
end;
$$;

revoke all on function private.register_student_row(uuid, jsonb, uuid, jsonb) from public, anon;
revoke all on function private.registration_error_code(text, text) from public, anon;
grant execute on function private.register_student_row(uuid, jsonb, uuid, jsonb) to authenticated;
grant execute on function private.registration_error_code(text, text) to authenticated;

revoke all on function public.register_student(uuid, jsonb, uuid, jsonb) from public, anon;
revoke all on function public.import_students(uuid, jsonb) from public, anon;
grant execute on function public.register_student(uuid, jsonb, uuid, jsonb) to authenticated;
grant execute on function public.import_students(uuid, jsonb) to authenticated;
