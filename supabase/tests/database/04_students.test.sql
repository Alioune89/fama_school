-- Inscription des élèves : unitaire et import en masse.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into public.schools (id, name, slug) values ('32000000-0000-4000-8000-00000000000f', 'École Test F', 'ecole-test-f');
insert into auth.users (id, aud, role, email) values
  ('42000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'sec.f@test.local'),
  ('42000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'prof.f@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('32000000-0000-4000-8000-00000000000f', '42000000-0000-4000-8000-0000000000f1', 'secretary'),
  ('32000000-0000-4000-8000-00000000000f', '42000000-0000-4000-8000-0000000000f2', 'teacher');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('52000000-0000-4000-8000-0000000000f1', '32000000-0000-4000-8000-00000000000f', '2026-2027', '2026-10-05', '2027-07-15', true);
insert into public.cycles (id, school_id, code, label, grading_scale) values
  ('62000000-0000-4000-8000-0000000000f1', '32000000-0000-4000-8000-00000000000f', 'elementaire', 'Élémentaire', 'ten');
insert into public.levels (id, school_id, cycle_id, code, label) values
  ('72000000-0000-4000-8000-0000000000f1', '32000000-0000-4000-8000-00000000000f', '62000000-0000-4000-8000-0000000000f1', 'CM2', 'Cours moyen 2');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('92000000-0000-4000-8000-0000000000f1', '32000000-0000-4000-8000-00000000000f', '52000000-0000-4000-8000-0000000000f1', '72000000-0000-4000-8000-0000000000f1', 'CM2 A');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "42000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.register_student(
       '32000000-0000-4000-8000-00000000000f',
       '{"first_name": "Khady", "last_name": "Seck", "sex": "F", "birth_date": "2015-04-12", "birth_place": "Thiès", "matricule": "F-001"}',
       '92000000-0000-4000-8000-0000000000f1',
       '[{"full_name": "Ousmane Seck", "phone": "+221709992001", "relationship": "father"},
         {"full_name": "Awa Ndiaye", "phone": "+221709992002", "relationship": "mother"}]') $$,
  'le secrétariat inscrit une élève avec ses deux parents'
);

select results_eq(
  $$ select g.full_name, sg.relationship::text, sg.is_primary
     from public.student_guardians sg join public.guardians g on g.id = sg.guardian_id
     join public.students s on s.id = sg.student_id where s.matricule = 'F-001' order by g.full_name $$,
  $$ values ('Awa Ndiaye'::text, 'mother'::text, false), ('Ousmane Seck'::text, 'father'::text, true) $$,
  'les deux parents sont liés, le premier est le contact principal'
);

select is(
  (select c.name from public.enrollments e join public.classes c on c.id = e.class_id join public.students s on s.id = e.student_id where s.matricule = 'F-001'),
  'CM2 A',
  'l''élève est inscrite dans sa classe pour l''année en cours'
);

select lives_ok(
  $$ select public.register_student(
       '32000000-0000-4000-8000-00000000000f',
       '{"first_name": "Moussa", "last_name": "Seck", "sex": "M"}',
       '92000000-0000-4000-8000-0000000000f1',
       '[{"full_name": "Ousmane Seck", "phone": "+221709992001", "relationship": "father"}]') $$,
  'un frère est inscrit avec le même parent'
);

select is(
  (select count(*)::int from public.guardians where school_id = '32000000-0000-4000-8000-00000000000f' and phone = '+221709992001'),
  1,
  'le parent déjà connu est réutilisé, pas dupliqué'
);

select is(
  public.import_students(
    '32000000-0000-4000-8000-00000000000f',
    '[{"row": 2, "class_name": "cm2  a", "student": {"first_name": "Aminata", "last_name": "Fall", "sex": "F"}, "guardians": []},
      {"row": 3, "class_name": "CM9 Z", "student": {"first_name": "Fantôme", "last_name": "Classe", "sex": "M"}, "guardians": []},
      {"row": 4, "class_name": "CM2 A", "student": {"first_name": "Doublon", "last_name": "Matricule", "sex": "M", "matricule": "F-001"}, "guardians": []}]'::jsonb
  ),
  '{"imported": 1, "errors": [{"row": 3, "code": "unknownClass"}, {"row": 4, "code": "duplicateMatricule"}]}'::jsonb,
  'l''import inscrit les lignes valides et signale les autres (classe inconnue, matricule en double)'
);

select is(
  (select count(*)::int from public.students where school_id = '32000000-0000-4000-8000-00000000000f'),
  3,
  'une ligne en erreur n''annule pas les autres'
);

select is(
  (select count(*)::int from public.students where last_name = 'Classe'),
  0,
  'une ligne en erreur ne laisse aucune donnée partielle'
);

-- Professeur : aucune inscription possible
select set_config('request.jwt.claims', '{"sub": "42000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.register_student(
       '32000000-0000-4000-8000-00000000000f',
       '{"first_name": "Intrus", "last_name": "Test", "sex": "M"}',
       '92000000-0000-4000-8000-0000000000f1', '[]') $$,
  '42501',
  null,
  'un professeur ne peut pas inscrire d''élève'
);

select is(
  public.import_students(
    '32000000-0000-4000-8000-00000000000f',
    '[{"row": 2, "class_name": "CM2 A", "student": {"first_name": "Intrus", "last_name": "Import", "sex": "M"}, "guardians": []}]'::jsonb
  ) -> 'imported',
  '0'::jsonb,
  'un professeur ne peut rien importer'
);

reset role;

select is(
  (select count(*)::int from public.students where last_name in ('Test', 'Import') and school_id = '32000000-0000-4000-8000-00000000000f'),
  0,
  'aucune donnée n''a été créée par le professeur'
);

select * from finish();
rollback;
