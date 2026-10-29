-- Cahier de textes : le professeur de la matière écrit ; chapitre mis en cours ; devoir prévenant les parents.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into public.schools (id, name, slug) values ('3f290000-0000-4000-8000-000000000010', 'École Test C', 'ecole-test-c');
insert into auth.users (id, aud, role, email) values
  ('4f290000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'prof.c@test.local'),
  ('4f290000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'parent.c@test.local');
insert into public.profiles (id, full_name) values ('4f290000-0000-4000-8000-000000000011', 'Moustapha Fall')
  on conflict (id) do update set full_name = excluded.full_name;
insert into public.school_memberships (school_id, user_id, role) values
  ('3f290000-0000-4000-8000-000000000010', '4f290000-0000-4000-8000-000000000011', 'teacher'),
  ('3f290000-0000-4000-8000-000000000010', '4f290000-0000-4000-8000-000000000012', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f8a0000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', '6f290000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.subjects (id, school_id, name) values
  ('8f290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', 'Mathématiques'),
  ('8f290000-0000-4000-8000-000000000012', '3f290000-0000-4000-8000-000000000010', 'Anglais');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('3f290000-0000-4000-8000-000000000010', '7f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000011', 4),
  ('3f290000-0000-4000-8000-000000000010', '7f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000012', 2);
insert into public.school_staff (id, school_id, full_name, phone, role, user_id) values
  ('af290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', 'Moustapha Fall', '+221770290011', 'teacher', '4f290000-0000-4000-8000-000000000011');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', '5f8a0000-0000-4000-8000-000000000011', '7f290000-0000-4000-8000-000000000011', '6e A');
insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id) values
  ('3f290000-0000-4000-8000-000000000010', '9f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000011', 'af290000-0000-4000-8000-000000000011');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0390000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', 'C-001', 'Awa', 'Seck', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f290000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000011', '9f290000-0000-4000-8000-000000000011', '5f8a0000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', 'Parent Seck', '4f290000-0000-4000-8000-000000000012');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f290000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000011', 'cf290000-0000-4000-8000-000000000011', true);
insert into public.programme_chapters (id, school_id, academic_year_id, level_id, subject_id, position, title) values
  ('cc290000-0000-4000-8000-000000000011', '3f290000-0000-4000-8000-000000000010', '5f8a0000-0000-4000-8000-000000000011',
   '7f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000011', 1, 'Fractions');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f290000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.lesson_entries (school_id, class_id, subject_id, taught_on, content, chapter_id, homework, homework_due_on)
     values ('3f290000-0000-4000-8000-000000000010', '9f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000011',
             current_date, 'Introduction aux fractions', 'cc290000-0000-4000-8000-000000000011',
             'Exercices 1 à 4 page 32', current_date + 2) $$,
  'le professeur de maths note sa séance et un devoir'
);
select is((select author_name from public.lesson_entries), 'Moustapha Fall', 'le nom de l''auteur est gardé');
select is(
  (select status from public.chapter_progress where chapter_id = 'cc290000-0000-4000-8000-000000000011'),
  'in_progress',
  'le chapitre travaillé passe « en cours »'
);
select throws_ok(
  $$ insert into public.lesson_entries (school_id, class_id, subject_id, taught_on, content)
     values ('3f290000-0000-4000-8000-000000000010', '9f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000012',
             current_date, 'Present simple') $$,
  '42501', null,
  'il n''écrit pas dans une matière qu''il n''enseigne pas'
);
select throws_ok(
  $$ insert into public.lesson_entries (school_id, class_id, subject_id, taught_on, content, homework)
     values ('3f290000-0000-4000-8000-000000000010', '9f290000-0000-4000-8000-000000000011', '8f290000-0000-4000-8000-000000000011',
             current_date, 'Séance', 'Devoir sans date') $$,
  '23514', null,
  'un devoir a toujours une date de remise'
);

select set_config('request.jwt.claims', '{"sub": "4f290000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select results_eq(
  $$ select homework, homework_due_on - current_date from public.lesson_entries $$,
  $$ values ('Exercices 1 à 4 page 32'::text, 2) $$,
  'le parent voit le devoir de la classe de son enfant'
);
select results_eq(
  $$ select kind, link, params ->> 'subject' from public.notifications $$,
  $$ values ('homework'::text, '/parent/devoirs'::text, 'Mathématiques'::text) $$,
  'et il a été prévenu par la cloche'
);
delete from public.lesson_entries;
reset role;
select is((select count(*)::int from public.lesson_entries where school_id = '3f290000-0000-4000-8000-000000000010'), 1,
  'mais ne modifie pas le cahier de textes (sa suppression n''a rien effacé)');

select * from finish();
rollback;
