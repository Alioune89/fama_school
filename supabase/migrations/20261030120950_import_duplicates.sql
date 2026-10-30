-- =============================================================================
-- Import d'élèves : protection contre les doublons.
--
-- Un élève est un doublon probable quand l'école a déjà un élève de mêmes prénom et nom (casse, accents et
-- espaces ignorés) et :
--   - de même date de naissance, si les deux dates sont connues ;
--   - sinon, inscrit cette année dans la même classe.
-- L'aperçu de l'import applique la même règle ; une ligne cochée « Importer quand même » (homonyme)
-- arrive avec allow_duplicate = true. Les lignes d'un même import se voient entre elles : un fichier
-- qui contient deux fois le même élève n'en crée qu'un.
-- =============================================================================

-- Forme comparable d'un prénom ou d'un nom : minuscules, sans accents, espaces simples.
create function private.name_key(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    btrim(translate(lower(coalesce(p_value, '')), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa')),
    '\s+', ' ', 'g'
  );
$$;
revoke all on function private.name_key(text) from public, anon;
grant execute on function private.name_key(text) to authenticated;

-- Élève déjà présent dans l'école (règle ci-dessus) ?
create function private.student_exists(
  p_school_id uuid,
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_class_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    where s.school_id = p_school_id
      and private.name_key(s.first_name) = private.name_key(p_first_name)
      and private.name_key(s.last_name) = private.name_key(p_last_name)
      and (
        (s.birth_date is not null and p_birth_date is not null and s.birth_date = p_birth_date)
        or (
          (s.birth_date is null or p_birth_date is null)
          and exists (
            select 1 from public.enrollments e
            where e.student_id = s.id and e.class_id = p_class_id and e.status = 'active'
          )
        )
      )
  );
$$;
revoke all on function private.student_exists(uuid, text, text, date, uuid) from public, anon;
grant execute on function private.student_exists(uuid, text, text, date, uuid) to authenticated;

create or replace function public.import_students(p_school_id uuid, p_rows jsonb)
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

      if not coalesce((v_row ->> 'allow_duplicate')::boolean, false)
        and private.student_exists(
          p_school_id,
          v_row -> 'student' ->> 'first_name',
          v_row -> 'student' ->> 'last_name',
          nullif(v_row -> 'student' ->> 'birth_date', '')::date,
          v_class_id
        ) then
        raise exception 'duplicateStudent' using errcode = 'P0001';
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
