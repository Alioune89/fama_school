-- Cloisonnement entre écoles (Lot 7.4) : le directeur d'une école ne voit rien d'une autre école.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.schools (id, name, slug) values
  ('3f320000-0000-4000-8000-00000000000a', 'École A', 'ecole-test-iso-a'),
  ('3f320000-0000-4000-8000-00000000000b', 'École B', 'ecole-test-iso-b');
insert into auth.users (id, aud, role, email) values
  ('4f320000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'directeur.a@test.local'),
  ('4f320000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'directeur.b@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f320000-0000-4000-8000-00000000000a', '4f320000-0000-4000-8000-00000000000a', 'director'),
  ('3f320000-0000-4000-8000-00000000000b', '4f320000-0000-4000-8000-00000000000b', 'director');

-- Des données dans l'école B.
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f8b0000-0000-4000-8000-00000000000b', '3f320000-0000-4000-8000-00000000000b', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f320000-0000-4000-8000-00000000000b', '3f320000-0000-4000-8000-00000000000b', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f320000-0000-4000-8000-00000000000b', '3f320000-0000-4000-8000-00000000000b', '6f320000-0000-4000-8000-00000000000b', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f320000-0000-4000-8000-00000000000b', '3f320000-0000-4000-8000-00000000000b', '5f8b0000-0000-4000-8000-00000000000b', '7f320000-0000-4000-8000-00000000000b', '6e A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0420000-0000-4000-8000-00000000000b', '3f320000-0000-4000-8000-00000000000b', 'B-001', 'Awa', 'Ba', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f320000-0000-4000-8000-00000000000b', 'b0420000-0000-4000-8000-00000000000b', '9f320000-0000-4000-8000-00000000000b', '5f8b0000-0000-4000-8000-00000000000b');
insert into public.guardians (school_id, full_name, phone) values
  ('3f320000-0000-4000-8000-00000000000b', 'Parent Ba', '+221770320011');
insert into public.invoices (school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('3f320000-0000-4000-8000-00000000000b', '5f8b0000-0000-4000-8000-00000000000b', 'b0420000-0000-4000-8000-00000000000b',
   'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', current_date, 25000);
insert into public.expenses (school_id, category, label, amount) values
  ('3f320000-0000-4000-8000-00000000000b', 'rent', 'Loyer', 300000);
insert into public.school_events (school_id, title, kind, starts_on, ends_on) values
  ('3f320000-0000-4000-8000-00000000000b', 'Vacances', 'holiday', current_date, current_date);
insert into public.daily_reports (school_id, author_id, author_name, body) values
  ('3f320000-0000-4000-8000-00000000000b', '4f320000-0000-4000-8000-00000000000b', 'Directeur B', 'Journée calme');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f320000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.classes where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'classes de l''autre école invisibles');
select is_empty($$ select 1 from public.students where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'élèves invisibles');
select is_empty($$ select 1 from public.enrollments where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'inscriptions invisibles');
select is_empty($$ select 1 from public.guardians where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'parents invisibles');
select is_empty($$ select 1 from public.invoices where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'factures invisibles');
select is_empty($$ select 1 from public.expenses where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'dépenses invisibles');
select is_empty($$ select 1 from public.school_events where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'calendrier invisible');
select is_empty($$ select 1 from public.daily_reports where school_id = '3f320000-0000-4000-8000-00000000000b' $$, 'rapports invisibles');
select throws_ok(
  $$ select public.record_payment('b0420000-0000-4000-8000-00000000000b', 1000, 'cash') $$,
  'P0001', 'forbidden',
  'pas d''encaissement pour un élève de l''autre école'
);
select throws_ok(
  $$ select public.publish_announcement('3f320000-0000-4000-8000-00000000000b', 'Intrusion', 'Texte', 'parents') $$,
  'P0001', 'forbidden',
  'pas d''annonce au nom de l''autre école'
);

select * from finish();
rollback;
