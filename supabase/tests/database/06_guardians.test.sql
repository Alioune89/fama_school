-- Parents et tuteurs depuis la fiche élève : ajout, contact principal, retrait, droits.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.schools (id, name, slug) values ('34000000-0000-4000-8000-00000000000b', 'École Test H', 'ecole-test-h');
insert into auth.users (id, aud, role, email) values
  ('44000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'sec.h@test.local'),
  ('44000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'prof.h@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('34000000-0000-4000-8000-00000000000b', '44000000-0000-4000-8000-0000000000b1', 'secretary'),
  ('34000000-0000-4000-8000-00000000000b', '44000000-0000-4000-8000-0000000000b2', 'teacher');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('a4000000-0000-4000-8000-0000000000b1', '34000000-0000-4000-8000-00000000000b', 'H-001', 'Adja', 'Thiam', 'F'),
  ('a4000000-0000-4000-8000-0000000000b2', '34000000-0000-4000-8000-00000000000b', 'H-002', 'Lamine', 'Thiam', 'M');
insert into public.guardians (id, school_id, full_name, phone) values
  ('c4000000-0000-4000-8000-0000000000b1', '34000000-0000-4000-8000-00000000000b', 'Modou Thiam', '+221709993001');
insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary) values
  ('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1', 'c4000000-0000-4000-8000-0000000000b1', 'father', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "44000000-0000-4000-8000-0000000000b1", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.add_student_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1',
       '{"full_name": "Seynabou Kane", "phone": "+221709993002", "relationship": "mother"}') $$,
  'le secrétariat ajoute la mère'
);

select results_eq(
  $$ select g.full_name, sg.is_primary from public.student_guardians sg join public.guardians g on g.id = sg.guardian_id
     where sg.student_id = 'a4000000-0000-4000-8000-0000000000b1' order by g.full_name $$,
  $$ values ('Modou Thiam'::text, true), ('Seynabou Kane'::text, false) $$,
  'le père reste contact principal'
);

select is(
  public.add_student_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b2',
    '{"full_name": "M. Thiam", "phone": "+221709993001", "relationship": "father"}'),
  'c4000000-0000-4000-8000-0000000000b1'::uuid,
  'un parent déjà connu (même numéro) est réutilisé pour le frère, devenant son contact principal'
);

select throws_ok(
  $$ select public.add_student_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1',
       '{"full_name": "Modou Thiam", "phone": "+221709993001", "relationship": "father"}') $$,
  'P0001', 'alreadyLinked',
  'un parent déjà relié à l''élève est refusé'
);

select lives_ok(
  $$ select public.set_primary_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1',
       (select id from public.guardians where phone = '+221709993002')) $$,
  'la mère devient contact principal'
);

select is(
  (select count(*)::int from public.student_guardians where student_id = 'a4000000-0000-4000-8000-0000000000b1' and is_primary),
  1,
  'un seul contact principal'
);

select lives_ok(
  $$ select public.remove_student_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1',
       (select id from public.guardians where phone = '+221709993002')) $$,
  'retirer le contact principal'
);

select is(
  (select guardian_id from public.student_guardians where student_id = 'a4000000-0000-4000-8000-0000000000b1' and is_primary),
  'c4000000-0000-4000-8000-0000000000b1'::uuid,
  'le parent restant prend le relais'
);

select throws_ok(
  $$ select public.remove_student_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1',
       'c4000000-0000-4000-8000-0000000000b1') $$,
  'P0001', 'lastGuardian',
  'l''élève garde au moins un parent'
);

select set_config('request.jwt.claims', '{"sub": "44000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.add_student_guardian('34000000-0000-4000-8000-00000000000b', 'a4000000-0000-4000-8000-0000000000b1',
       '{"full_name": "Intrus", "phone": "+221709993009", "relationship": "other"}') $$,
  'P0001', 'forbidden',
  'un professeur ne peut pas ajouter de parent'
);

select * from finish();
rollback;
