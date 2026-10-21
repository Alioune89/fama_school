-- =============================================================================
-- Lot 2 — Présence côté direction : absences et retards par élève sur une période.
--
-- L'unité est la demi-journée (un appel du matin ou de l'après-midi), comme dans les
-- registres d'appel. Fonction « security invoker » : la RLS limite aux élèves visibles.
-- =============================================================================

create function public.attendance_absence_summary(p_school_id uuid, p_from date, p_to date)
returns table (
  student_id uuid,
  first_name text,
  last_name text,
  class_name text,
  absences integer,
  lates integer,
  last_absence date
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.student_id,
    s.first_name,
    s.last_name,
    (
      select c.name
      from public.enrollments e
      join public.classes c on c.id = e.class_id
      join public.academic_years y on y.id = e.academic_year_id
      where e.student_id = r.student_id and e.status = 'active' and y.is_current
      limit 1
    ),
    (count(*) filter (where r.status = 'absent'))::integer,
    (count(*) filter (where r.status = 'late'))::integer,
    max(r.date) filter (where r.status = 'absent')
  from public.attendance_records r
  join public.students s on s.id = r.student_id
  where r.school_id = p_school_id
    and r.date between p_from and p_to
    and r.status <> 'present'
  group by r.student_id, s.first_name, s.last_name;
$$;

comment on function public.attendance_absence_summary(uuid, date, date) is
  'Demi-journées d''absence et retards de chaque élève sur une période (élèves sans absence ni retard exclus).';

revoke all on function public.attendance_absence_summary(uuid, date, date) from public, anon;
grant execute on function public.attendance_absence_summary(uuid, date, date) to authenticated;
