-- =============================================================================
-- Lot 1 — Fonctions de la mise en route.
-- Remplacement atomique de la grille matières × niveaux : une seule requête au lieu d'une
-- par case, et jamais d'enregistrement partiel. « security invoker » : la RLS s'applique
-- (seule la direction des études peut écrire).
-- =============================================================================

create function public.replace_level_subjects(p_school_id uuid, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows doit être un tableau' using errcode = '22023';
  end if;

  delete from public.level_subjects ls
  where ls.school_id = p_school_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_rows) as w (level_id uuid, subject_id uuid)
      where w.level_id = ls.level_id and w.subject_id = ls.subject_id
    );

  insert into public.level_subjects (school_id, level_id, subject_id, coefficient)
  select p_school_id, w.level_id, w.subject_id, w.coefficient
  from jsonb_to_recordset(p_rows) as w (level_id uuid, subject_id uuid, coefficient numeric)
  on conflict (level_id, subject_id) do update set coefficient = excluded.coefficient
  where public.level_subjects.coefficient is distinct from excluded.coefficient;

  v_count := jsonb_array_length(p_rows);
  return v_count;
end;
$$;

comment on function public.replace_level_subjects(uuid, jsonb) is
  'Remplace la grille des coefficients d''une école par l''ensemble fourni (tableau de {level_id, subject_id, coefficient}).';

revoke all on function public.replace_level_subjects(uuid, jsonb) from public, anon;
grant execute on function public.replace_level_subjects(uuid, jsonb) to authenticated;

-- Les intitulés de groupes officiels sont longs (« Éducation à la science et à la vie sociale »).
alter table public.subjects drop constraint subjects_subject_group_check;
alter table public.subjects add constraint subjects_subject_group_check check (char_length(subject_group) <= 80);
