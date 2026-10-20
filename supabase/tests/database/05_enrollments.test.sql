-- Parcours de l'élève : changement de classe, départ et droits.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.schools (id, name, slug) values ('33000000-0000-4000-8000-00000000000a', 'École Test G', 'ecole-test-g');
insert into auth.users (id, aud, role, email) values
  ('43000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'sec.g@test.local'),
  ('43000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'prof.g@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('33000000-0000-4000-8000-00000000000a', '43000000-0000-4000-8000-0000000000a1', 'secretary'),
  ('33000000-0000-4000-8000-00000000000a', '43000000-0000-4000-8000-0000000000a2', 'teacher');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('53000000-0000-4000-8000-0000000000a1', '33000000-0000-4000-8000-00000000000a', '2026-2027', '2026-10-05', '2027-07-15', true),
  ('53000000-0000-4000-8000-0000000000a2', '33000000-0000-4000-8000-00000000000a', '2025-2026', '2025-10-06', '2026-07-15', false);
insert into public.cycles (id, school_id, code, label, grading_scale) values
  ('63000000-0000-4000-8000-0000000000a1', '33000000-0000-4000-8000-00000000000a', 'elementaire', 'Élémentaire', 'ten');
insert into public.levels (id, school_id, cycle_id, code, label) values
  ('73000000-0000-4000-8000-0000000000a1', '33000000-0000-4000-8000-00000000000a', '63000000-0000-4000-8000-0000000000a1', 'CM1', 'Cours moyen 1');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('93000000-0000-4000-8000-0000000000a1', '33000000-0000-4000-8000-00000000000a', '53000000-0000-4000-8000-0000000000a1', '73000000-0000-4000-8000-0000000000a1', 'CM1 A'),
  ('93000000-0000-4000-8000-0000000000a2', '33000000-0000-4000-8000-00000000000a', '53000000-0000-4000-8000-0000000000a1', '73000000-0000-4000-8000-0000000000a1', 'CM1 B'),
  ('93000000-0000-4000-8000-0000000000a3', '33000000-0000-4000-8000-00000000000a', '53000000-0000-4000-8000-0000000000a2', '73000000-0000-4000-8000-0000000000a1', 'CM1 A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('a3000000-0000-4000-8000-0000000000a1', '33000000-0000-4000-8000-00000000000a', 'G-001', 'Cheikh', 'Kane', 'M');
insert into public.enrollments (id, school_id, student_id, class_id, academic_year_id, enrolled_on) values
  ('b3000000-0000-4000-8000-0000000000a1', '33000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-0000000000a1',
   '93000000-0000-4000-8000-0000000000a1', '53000000-0000-4000-8000-0000000000a1', '2026-10-05');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "43000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

select lives_ok(
  $$ update public.enrollments set class_id = '93000000-0000-4000-8000-0000000000a2' where id = 'b3000000-0000-4000-8000-0000000000a1' $$,
  'le secrétariat change l''élève de classe dans la même année'
);

select throws_ok(
  $$ update public.enrollments set class_id = '93000000-0000-4000-8000-0000000000a3' where id = 'b3000000-0000-4000-8000-0000000000a1' $$,
  '23503', null,
  'une classe d''une autre année est refusée'
);

select throws_ok(
  $$ update public.enrollments set status = 'transferred' where id = 'b3000000-0000-4000-8000-0000000000a1' $$,
  '23514', null,
  'un transfert sans date de départ est refusé'
);

select throws_ok(
  $$ update public.enrollments set status = 'left', left_on = '2026-09-01' where id = 'b3000000-0000-4000-8000-0000000000a1' $$,
  '23514', null,
  'un départ antérieur à l''inscription est refusé'
);

select lives_ok(
  $$ update public.enrollments set status = 'transferred', left_on = '2026-12-20' where id = 'b3000000-0000-4000-8000-0000000000a1' $$,
  'un transfert daté est enregistré'
);

-- Un professeur ne modifie pas les inscriptions (la RLS filtre la mise à jour).
select set_config('request.jwt.claims', '{"sub": "43000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
update public.enrollments set status = 'active', left_on = null where id = 'b3000000-0000-4000-8000-0000000000a1';

reset role;
select is(
  (select status::text from public.enrollments where id = 'b3000000-0000-4000-8000-0000000000a1'),
  'transferred',
  'un professeur ne peut pas annuler un départ'
);
select is(
  (select class_id from public.enrollments where id = 'b3000000-0000-4000-8000-0000000000a1'),
  '93000000-0000-4000-8000-0000000000a2'::uuid,
  'la classe reste celle choisie par le secrétariat'
);

select * from finish();
rollback;
