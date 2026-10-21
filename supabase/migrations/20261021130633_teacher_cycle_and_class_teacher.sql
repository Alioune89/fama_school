-- =============================================================================
-- Enseignants : cycle d'enseignement et genre (titre proposé : éducatrice, instituteur, professeure…).
--
-- Au préscolaire et à l'élémentaire, le titulaire de la classe (classes.homeroom_staff_id)
-- enseigne toutes les matières ; une affectation par matière (teaching_assignments) ne sert
-- qu'aux exceptions (arabe, anglais, EPS confiés à un autre enseignant).
-- =============================================================================

alter table public.school_staff
  add column sex public.sex,
  add column cycle public.cycle_code;

comment on column public.school_staff.cycle is 'Cycle où l''enseignant exerce principalement (filtre de la liste, titre proposé).';

create index school_staff_school_cycle_idx on public.school_staff (school_id, cycle) where role = 'teacher';

-- Enseignants existants : le cycle le plus représenté dans leurs classes (affectations et titulariat).
update public.school_staff s
set cycle = found.code
from (
  select distinct on (staff_id) staff_id, code
  from (
    select ta.staff_id, cy.code
    from public.teaching_assignments ta
    join public.classes c on c.id = ta.class_id
    join public.levels l on l.id = c.level_id
    join public.cycles cy on cy.id = l.cycle_id
    union all
    select c.homeroom_staff_id, cy.code
    from public.classes c
    join public.levels l on l.id = c.level_id
    join public.cycles cy on cy.id = l.cycle_id
    where c.homeroom_staff_id is not null
  ) classes_taught
  group by staff_id, code
  order by staff_id, count(*) desc, code
) found
where s.id = found.staff_id and s.role = 'teacher' and s.cycle is null;
