-- =============================================================================
-- Staging : ajoute le surveillant général de démonstration des Baobabs (déjà présent dans seed.sql
-- pour les nouvelles bases). Sans effet s'il existe déjà. À coller une fois dans SQL Editor.
-- Les numéros de test (code 123456) se déclarent à part : Authentication > Sign In / Providers > Phone.
-- =============================================================================
insert into public.school_staff (school_id, full_name, phone, role, title, sex, created_by)
select s.id, 'Pape Diouf', '+221770990009', 'supervisor', 'Surveillant général', 'M', d.user_id
from public.schools s
join public.school_staff d on d.school_id = s.id and d.role = 'director'
where s.slug = 'les-baobabs'
  and not exists (
    select 1 from public.school_staff x where x.school_id = s.id and x.phone = '+221770990009'
  )
limit 1;
