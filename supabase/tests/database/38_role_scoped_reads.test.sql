-- Lecture selon le métier : chaque membre de la direction ne lit que les données de son métier ;
-- le directeur lit tout. Colonnes vérifiées : factures, pointage, appréciations, cahier de textes, élèves.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into public.schools (id, name, slug) values ('3f380000-0000-4000-8000-000000000010', 'École Test R', 'ecole-test-roles');
insert into auth.users (id, aud, role, email) values
  ('4f380000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'directeur.r@test.local'),
  ('4f380000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'censeur.r@test.local'),
  ('4f380000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'surveillant.r@test.local'),
  ('4f380000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'comptable.r@test.local'),
  ('4f380000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'secretaire.r@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f380000-0000-4000-8000-000000000010', '4f380000-0000-4000-8000-000000000011', 'director'),
  ('3f380000-0000-4000-8000-000000000010', '4f380000-0000-4000-8000-000000000012', 'censor'),
  ('3f380000-0000-4000-8000-000000000010', '4f380000-0000-4000-8000-000000000013', 'supervisor'),
  ('3f380000-0000-4000-8000-000000000010', '4f380000-0000-4000-8000-000000000014', 'accountant'),
  ('3f380000-0000-4000-8000-000000000010', '4f380000-0000-4000-8000-000000000015', 'secretary');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on) values
  ('5a380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', '5f380000-0000-4000-8000-000000000011', 1, '1er semestre', current_date - 60, current_date + 60);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 3);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', '6f380000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', '5f380000-0000-4000-8000-000000000011', '7f380000-0000-4000-8000-000000000011', '6e A');
insert into public.subjects (id, school_id, name) values
  ('7a380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', 'Mathématiques');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', 'R-001', 'Awa', 'Ba', 'F');

-- Une donnée de chaque métier (sans les contrôles de saisie des déclencheurs, hors sujet ici).
set local session_replication_role = replica;
insert into public.invoices (school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('3f380000-0000-4000-8000-000000000010', '5f380000-0000-4000-8000-000000000011', 'b0380000-0000-4000-8000-000000000011',
   'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', current_date, 25000);
insert into public.student_arrivals (id, school_id, student_id, date, scanned_at) values
  ('c0380000-0000-4000-8000-000000000011', '3f380000-0000-4000-8000-000000000010', 'b0380000-0000-4000-8000-000000000011', current_date, now());
insert into public.subject_appreciations (school_id, class_id, subject_id, period_id, student_id, text) values
  ('3f380000-0000-4000-8000-000000000010', '9f380000-0000-4000-8000-000000000011', '7a380000-0000-4000-8000-000000000011',
   '5a380000-0000-4000-8000-000000000011', 'b0380000-0000-4000-8000-000000000011', 'Bon travail');
insert into public.lesson_entries (id, school_id, class_id, subject_id, taught_on, content, author_name) values
  ('c0380000-0000-4000-8000-000000000012', '3f380000-0000-4000-8000-000000000010', '9f380000-0000-4000-8000-000000000011',
   '7a380000-0000-4000-8000-000000000011', current_date, 'Les fractions', 'Professeur');
set local session_replication_role = origin;

-- « factures, pointage, appréciations, cahier de textes, élèves » vus par l'utilisateur connecté.
create function pg_temp.visible() returns text language sql as $$
  select concat_ws(',',
    (select count(*) from public.invoices where school_id = '3f380000-0000-4000-8000-000000000010'),
    (select count(*) from public.student_arrivals where school_id = '3f380000-0000-4000-8000-000000000010'),
    (select count(*) from public.subject_appreciations where school_id = '3f380000-0000-4000-8000-000000000010'),
    (select count(*) from public.lesson_entries where school_id = '3f380000-0000-4000-8000-000000000010'),
    (select count(*) from public.students where school_id = '3f380000-0000-4000-8000-000000000010'))
$$;
grant execute on function pg_temp.visible() to authenticated;

set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "4f380000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is(pg_temp.visible(), '1,1,1,1,1', 'le directeur lit tout');

select set_config('request.jwt.claims', '{"sub": "4f380000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is(pg_temp.visible(), '0,1,1,1,1', 'le censeur : présences et pédagogie, pas les finances');

select set_config('request.jwt.claims', '{"sub": "4f380000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is(pg_temp.visible(), '0,1,0,0,1', 'le surveillant : présences seulement');

select set_config('request.jwt.claims', '{"sub": "4f380000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select is(pg_temp.visible(), '1,0,0,0,1', 'le comptable : finances seulement');

select set_config('request.jwt.claims', '{"sub": "4f380000-0000-4000-8000-000000000015", "role": "authenticated"}', true);
select is(pg_temp.visible(), '0,0,1,0,1', 'la secrétaire : notes et bulletins, pas les présences ni les finances');

select set_config('request.jwt.claims', '{"sub": "4f380000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select is_empty(
  $$ select 1 from public.attendance_records where school_id = '3f380000-0000-4000-8000-000000000010'
     union all select 1 from public.grades where school_id = '3f380000-0000-4000-8000-000000000010' $$,
  'le comptable ne lit ni les appels ni les notes'
);

select * from finish();
rollback;
