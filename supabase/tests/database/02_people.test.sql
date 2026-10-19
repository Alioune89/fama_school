-- Lot 1 : répertoire, élèves, familles, structure pédagogique.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Données de test : école C (complète) et école D (isolée)
-- ---------------------------------------------------------------------------
insert into public.schools (id, name, slug) values
  ('30000000-0000-4000-8000-00000000000c', 'École Test C', 'ecole-test-c'),
  ('30000000-0000-4000-8000-00000000000d', 'École Test D', 'ecole-test-d');

insert into auth.users (id, aud, role, email) values
  ('40000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'dir.c@test.local'),
  ('40000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'sec.c@test.local');

insert into public.school_memberships (school_id, user_id, role) values
  ('30000000-0000-4000-8000-00000000000c', '40000000-0000-4000-8000-0000000000c1', 'director'),
  ('30000000-0000-4000-8000-00000000000c', '40000000-0000-4000-8000-0000000000c2', 'secretary');

insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('50000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', '2026-2027', '2026-10-05', '2027-07-15', true),
  ('50000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-00000000000d', '2026-2027', '2026-10-05', '2027-07-15', true);

insert into public.cycles (id, school_id, code, label, grading_scale) values
  ('60000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', 'moyen', 'Moyen', 'twenty'),
  ('60000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-00000000000d', 'moyen', 'Moyen', 'twenty');

insert into public.levels (id, school_id, cycle_id, code, label) values
  ('70000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', '60000000-0000-4000-8000-0000000000c1', '6e', 'Sixième'),
  ('70000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-00000000000d', '60000000-0000-4000-8000-0000000000d1', '6e', 'Sixième');

insert into public.subjects (id, school_id, name) values
  ('80000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', 'Mathématiques');

insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('90000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', '50000000-0000-4000-8000-0000000000c1', '70000000-0000-4000-8000-0000000000c1', '6e A'),
  ('90000000-0000-4000-8000-0000000000c2', '30000000-0000-4000-8000-00000000000c', '50000000-0000-4000-8000-0000000000c1', '70000000-0000-4000-8000-0000000000c1', '6e B'),
  ('90000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-00000000000d', '50000000-0000-4000-8000-0000000000d1', '70000000-0000-4000-8000-0000000000d1', '6e A');

-- ---------------------------------------------------------------------------
-- Répertoire → invitation → compte
-- ---------------------------------------------------------------------------
insert into public.school_staff (id, school_id, full_name, phone, role, contract) values
  ('a1000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', 'Prof C', '+221709991001', 'teacher', 'permanent');

select is(
  (select count(*)::int from public.invitations
   where school_id = '30000000-0000-4000-8000-00000000000c' and phone = '+221709991001' and role = 'teacher' and accepted_at is null),
  1,
  'saisir un professeur dans le répertoire crée son invitation'
);

insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id)
values ('30000000-0000-4000-8000-00000000000c', '90000000-0000-4000-8000-0000000000c1', '80000000-0000-4000-8000-0000000000c1', 'a1000000-0000-4000-8000-0000000000c1');

-- Première connexion du professeur
insert into auth.users (id, aud, role, phone) values
  ('40000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', '221709991001');

select is(
  (select user_id from public.school_staff where id = 'a1000000-0000-4000-8000-0000000000c1'),
  '40000000-0000-4000-8000-0000000000c3'::uuid,
  'la fiche du répertoire est reliée au compte à la première connexion'
);

select is(
  (select role::text from public.school_memberships
   where user_id = '40000000-0000-4000-8000-0000000000c3' and school_id = '30000000-0000-4000-8000-00000000000c'),
  'teacher',
  'le professeur obtient son accès à l''école'
);

-- Élèves (matricule automatique) et familles
insert into public.students (id, school_id, first_name, last_name, sex) values
  ('b1000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', 'Awa', 'Test', 'F'),
  ('b1000000-0000-4000-8000-0000000000c2', '30000000-0000-4000-8000-00000000000c', 'Modou', 'Test', 'M'),
  ('b1000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-00000000000d', 'Fatou', 'Ailleurs', 'F');

select matches(
  (select matricule from public.students where id = 'b1000000-0000-4000-8000-0000000000c1'),
  '^\d{4}-0001$',
  'le premier élève reçoit un matricule automatique (AAAA-0001)'
);

select is(
  (select matricule from public.students where id = 'b1000000-0000-4000-8000-0000000000c2'),
  extract(year from current_date)::text || '-0002',
  'les matricules se suivent sans trou'
);

insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('30000000-0000-4000-8000-00000000000c', 'b1000000-0000-4000-8000-0000000000c1', '90000000-0000-4000-8000-0000000000c1', '50000000-0000-4000-8000-0000000000c1'),
  ('30000000-0000-4000-8000-00000000000c', 'b1000000-0000-4000-8000-0000000000c2', '90000000-0000-4000-8000-0000000000c2', '50000000-0000-4000-8000-0000000000c1'),
  ('30000000-0000-4000-8000-00000000000d', 'b1000000-0000-4000-8000-0000000000d1', '90000000-0000-4000-8000-0000000000d1', '50000000-0000-4000-8000-0000000000d1');

select throws_ok(
  $$ insert into public.enrollments (school_id, student_id, class_id, academic_year_id)
     values ('30000000-0000-4000-8000-00000000000c', 'b1000000-0000-4000-8000-0000000000d1', '90000000-0000-4000-8000-0000000000c1', '50000000-0000-4000-8000-0000000000c1') $$,
  '23503',
  null,
  'la base refuse d''inscrire l''élève d''une autre école dans une classe'
);

insert into public.guardians (id, school_id, full_name, phone) values
  ('c1000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-00000000000c', 'Parent C', '+221709991002'),
  ('c1000000-0000-4000-8000-0000000000c2', '30000000-0000-4000-8000-00000000000c', 'Autre Parent', '+221709991003');

insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary) values
  ('30000000-0000-4000-8000-00000000000c', 'b1000000-0000-4000-8000-0000000000c1', 'c1000000-0000-4000-8000-0000000000c1', 'mother', true),
  ('30000000-0000-4000-8000-00000000000c', 'b1000000-0000-4000-8000-0000000000c2', 'c1000000-0000-4000-8000-0000000000c2', 'father', true);

insert into auth.users (id, aud, role, phone) values
  ('40000000-0000-4000-8000-0000000000c4', 'authenticated', 'authenticated', '221709991002');

select is(
  (select user_id from public.guardians where id = 'c1000000-0000-4000-8000-0000000000c1'),
  '40000000-0000-4000-8000-0000000000c4'::uuid,
  'le parent est relié à sa fiche à la première connexion'
);

-- ---------------------------------------------------------------------------
-- Professeur : ses classes seulement
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "40000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);

select results_eq(
  'select first_name from public.students order by first_name',
  $$ values ('Awa'::text) $$,
  'un professeur ne voit que les élèves des classes où il enseigne'
);

select is(
  (select count(*)::int from public.classes),
  2,
  'un professeur voit les classes de son école (emploi du temps, annuaire)'
);

select throws_ok(
  $$ insert into public.students (school_id, first_name, last_name, sex)
     values ('30000000-0000-4000-8000-00000000000c', 'Intrus', 'Test', 'M') $$,
  '42501',
  null,
  'un professeur ne peut pas créer d''élève'
);

select is(
  (select count(*)::int from public.guardians),
  0,
  'un professeur ne voit pas les fiches des parents (avant la messagerie du Lot 6)'
);

-- ---------------------------------------------------------------------------
-- Parent : ses enfants seulement
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "40000000-0000-4000-8000-0000000000c4", "role": "authenticated"}', true);

select results_eq(
  'select first_name from public.students order by first_name',
  $$ values ('Awa'::text) $$,
  'un parent ne voit que ses enfants'
);

select results_eq(
  'select full_name from public.guardians',
  $$ values ('Parent C'::text) $$,
  'un parent ne voit que sa propre fiche'
);

select is(
  (select count(*)::int from public.enrollments),
  1,
  'un parent ne voit que l''inscription de son enfant'
);

-- ---------------------------------------------------------------------------
-- Secrétariat
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "40000000-0000-4000-8000-0000000000c2", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.students (school_id, first_name, last_name, sex)
     values ('30000000-0000-4000-8000-00000000000c', 'Nouvelle', 'Inscrite', 'F') $$,
  'le secrétariat inscrit un élève'
);

select lives_ok(
  $$ insert into public.school_staff (school_id, full_name, phone, role, contract)
     values ('30000000-0000-4000-8000-00000000000c', 'Vacataire C', '+221709991004', 'teacher', 'vacataire') $$,
  'le secrétariat ajoute un professeur au répertoire'
);

select throws_ok(
  $$ insert into public.school_staff (school_id, full_name, phone, role)
     values ('30000000-0000-4000-8000-00000000000c', 'Faux Directeur', '+221709991005', 'director') $$,
  '42501',
  null,
  'le secrétariat ne peut pas nommer un directeur'
);

select throws_ok(
  $$ insert into public.classes (school_id, academic_year_id, level_id, name)
     values ('30000000-0000-4000-8000-00000000000c', '50000000-0000-4000-8000-0000000000c1', '70000000-0000-4000-8000-0000000000c1', '6e C') $$,
  '42501',
  null,
  'le secrétariat ne crée pas de classe (réservé à la direction des études)'
);

-- ---------------------------------------------------------------------------
-- Direction
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "40000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.students),
  3,
  'la direction voit tous les élèves de son école, et seulement ceux-là'
);

select throws_ok(
  $$ update public.school_staff set user_id = '40000000-0000-4000-8000-0000000000c1' where id = 'a1000000-0000-4000-8000-0000000000c1' $$,
  '42501',
  null,
  'le lien entre fiche et compte ne peut pas être modifié par l''application'
);

update public.school_staff set status = 'inactive' where id = 'a1000000-0000-4000-8000-0000000000c1';

reset role;

select is(
  (select status::text from public.school_memberships
   where user_id = '40000000-0000-4000-8000-0000000000c3' and school_id = '30000000-0000-4000-8000-00000000000c'),
  'suspended',
  'désactiver un professeur suspend son accès'
);

select is(
  (select count(*)::int from public.audit_log where table_name = 'students' and school_id = '30000000-0000-4000-8000-00000000000c'),
  3,
  'chaque inscription d''élève est journalisée'
);

select * from finish();
rollback;
