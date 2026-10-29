-- Programme et progression : rédaction par les professeurs de la matière, avancement par classe, validation.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into public.schools (id, name, slug) values ('3f280000-0000-4000-8000-000000000010', 'École Test P', 'ecole-test-p');
insert into auth.users (id, aud, role, email) values
  ('4f280000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'prof.p@test.local'),
  ('4f280000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.p@test.local'),
  ('4f280000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'censeur.p@test.local'),
  ('4f280000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'parent.p@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f280000-0000-4000-8000-000000000010', '4f280000-0000-4000-8000-000000000011', 'teacher'),
  ('3f280000-0000-4000-8000-000000000010', '4f280000-0000-4000-8000-000000000012', 'teacher'),
  ('3f280000-0000-4000-8000-000000000010', '4f280000-0000-4000-8000-000000000013', 'censor'),
  ('3f280000-0000-4000-8000-000000000010', '4f280000-0000-4000-8000-000000000014', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f890000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', '6f280000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.subjects (id, school_id, name) values
  ('8f280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', 'Mathématiques'),
  ('8f280000-0000-4000-8000-000000000012', '3f280000-0000-4000-8000-000000000010', 'Anglais');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('3f280000-0000-4000-8000-000000000010', '7f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000011', 4),
  ('3f280000-0000-4000-8000-000000000010', '7f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000012', 2);
insert into public.school_staff (id, school_id, full_name, phone, role, user_id) values
  ('af280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', 'Prof Maths', '+221770280011', 'teacher', '4f280000-0000-4000-8000-000000000011'),
  ('af280000-0000-4000-8000-000000000012', '3f280000-0000-4000-8000-000000000010', 'Prof Anglais', '+221770280012', 'teacher', '4f280000-0000-4000-8000-000000000012');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', '5f890000-0000-4000-8000-000000000011', '7f280000-0000-4000-8000-000000000011', '6e A');
insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id) values
  ('3f280000-0000-4000-8000-000000000010', '9f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000011', 'af280000-0000-4000-8000-000000000011'),
  ('3f280000-0000-4000-8000-000000000010', '9f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000012', 'af280000-0000-4000-8000-000000000012');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0380000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', 'P-001', 'Awa', 'Kane', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f280000-0000-4000-8000-000000000010', 'b0380000-0000-4000-8000-000000000011', '9f280000-0000-4000-8000-000000000011', '5f890000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', 'Parent Kane', '4f280000-0000-4000-8000-000000000014');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f280000-0000-4000-8000-000000000010', 'b0380000-0000-4000-8000-000000000011', 'cf280000-0000-4000-8000-000000000011', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f280000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.programme_chapters (id, school_id, academic_year_id, level_id, subject_id, position, title, sessions, target_month) values
       ('cc280000-0000-4000-8000-000000000011', '3f280000-0000-4000-8000-000000000010', '5f890000-0000-4000-8000-000000000011',
        '7f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000011', 1, 'Nombres entiers', 6, '2026-11-01') $$,
  'le professeur de maths rédige le programme de maths de la sixième'
);
select throws_ok(
  $$ insert into public.programme_chapters (school_id, academic_year_id, level_id, subject_id, title)
     values ('3f280000-0000-4000-8000-000000000010', '5f890000-0000-4000-8000-000000000011',
             '7f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000012', 'Present simple') $$,
  '42501', null,
  'mais pas celui d''anglais'
);
select lives_ok(
  $$ select public.set_chapter_progress('9f280000-0000-4000-8000-000000000011', 'cc280000-0000-4000-8000-000000000011', 'in_progress') $$,
  'il commence le chapitre avec la 6e A'
);
select lives_ok(
  $$ select public.set_chapter_progress('9f280000-0000-4000-8000-000000000011', 'cc280000-0000-4000-8000-000000000011', 'done') $$,
  'puis le termine'
);

select set_config('request.jwt.claims', '{"sub": "4f280000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.set_chapter_progress('9f280000-0000-4000-8000-000000000011', 'cc280000-0000-4000-8000-000000000011', 'in_progress') $$,
  'P0001', 'forbidden',
  'le professeur d''anglais ne touche pas à la progression en maths'
);

-- Le censeur est prévenu et valide.
select set_config('request.jwt.claims', '{"sub": "4f280000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select results_eq(
  $$ select kind, params ->> 'chapter', params ->> 'className' from public.notifications $$,
  $$ values ('chapterDone'::text, 'Nombres entiers'::text, '6e A'::text) $$,
  'le censeur est prévenu qu''un chapitre est terminé'
);
select lives_ok(
  $$ select public.validate_chapter('9f280000-0000-4000-8000-000000000011', 'cc280000-0000-4000-8000-000000000011', true) $$,
  'il le valide'
);
select is((select count(*)::int from public.notifications), 0, 'la notification disparaît une fois validé');

select set_config('request.jwt.claims', '{"sub": "4f280000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.set_chapter_progress('9f280000-0000-4000-8000-000000000011', 'cc280000-0000-4000-8000-000000000011', 'in_progress') $$,
  'P0001', 'forbidden',
  'un chapitre validé ne se rouvre que par la direction'
);
select throws_ok(
  $$ select public.validate_chapter('9f280000-0000-4000-8000-000000000011', 'cc280000-0000-4000-8000-000000000011', true) $$,
  'P0001', 'forbidden',
  'le professeur ne valide pas lui-même'
);

-- Le parent voit la progression de la classe de son enfant.
select set_config('request.jwt.claims', '{"sub": "4f280000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select results_eq(
  $$ select c.title, p.status from public.programme_chapters c join public.chapter_progress p on p.chapter_id = c.id $$,
  $$ values ('Nombres entiers'::text, 'validated'::text) $$,
  'le parent voit le programme et l''avancement de la classe'
);
select throws_ok(
  $$ insert into public.programme_chapters (school_id, academic_year_id, level_id, subject_id, title)
     values ('3f280000-0000-4000-8000-000000000010', '5f890000-0000-4000-8000-000000000011',
             '7f280000-0000-4000-8000-000000000011', '8f280000-0000-4000-8000-000000000011', 'Intrus') $$,
  '42501', null,
  'mais ne le modifie pas'
);

select * from finish();
rollback;
