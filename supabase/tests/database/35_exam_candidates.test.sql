-- Examens : candidats des seules classes d'examen, saisie réservée, résultat notifié aux parents, visible d'eux seuls.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into public.schools (id, name, slug) values ('3f350000-0000-4000-8000-000000000010', 'École Test E', 'ecole-test-examens');
insert into auth.users (id, aud, role, email) values
  ('4f350000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'censeur.e@test.local'),
  ('4f350000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.e@test.local'),
  ('4f350000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.e@test.local'),
  ('4f350000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'autre.e@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f350000-0000-4000-8000-000000000010', '4f350000-0000-4000-8000-000000000011', 'censor'),
  ('3f350000-0000-4000-8000-000000000010', '4f350000-0000-4000-8000-000000000012', 'teacher'),
  ('3f350000-0000-4000-8000-000000000010', '4f350000-0000-4000-8000-000000000013', 'parent'),
  ('3f350000-0000-4000-8000-000000000010', '4f350000-0000-4000-8000-000000000014', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f350000-0000-4000-8000-000000000011', '3f350000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f350000-0000-4000-8000-000000000011', '3f350000-0000-4000-8000-000000000010', 'secondaire', 'Secondaire', 'twenty', 4);
insert into public.levels (id, school_id, cycle_id, code, label, series, exam, position) values
  ('7f350000-0000-4000-8000-000000000011', '3f350000-0000-4000-8000-000000000010', '6f350000-0000-4000-8000-000000000011', 'Tle', 'Terminale S1', 'S1', 'BAC', 12),
  ('7f350000-0000-4000-8000-000000000012', '3f350000-0000-4000-8000-000000000010', '6f350000-0000-4000-8000-000000000011', '1ère', 'Première S1', 'S1', null, 11);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f350000-0000-4000-8000-000000000011', '3f350000-0000-4000-8000-000000000010', '5f350000-0000-4000-8000-000000000011', '7f350000-0000-4000-8000-000000000011', 'Tle S1'),
  ('9f350000-0000-4000-8000-000000000012', '3f350000-0000-4000-8000-000000000010', '5f350000-0000-4000-8000-000000000011', '7f350000-0000-4000-8000-000000000012', '1ère S1');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0350000-0000-4000-8000-000000000011', '3f350000-0000-4000-8000-000000000010', 'E-001', 'Aïda', 'Diop', 'F'),
  ('b0350000-0000-4000-8000-000000000012', '3f350000-0000-4000-8000-000000000010', 'E-002', 'Malick', 'Sy', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f350000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000011', '9f350000-0000-4000-8000-000000000011', '5f350000-0000-4000-8000-000000000011'),
  ('3f350000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000012', '9f350000-0000-4000-8000-000000000012', '5f350000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf350000-0000-4000-8000-000000000011', '3f350000-0000-4000-8000-000000000010', 'Parent Diop', '4f350000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f350000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000011', 'cf350000-0000-4000-8000-000000000011', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f350000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.save_exam_candidates('3f350000-0000-4000-8000-000000000010', 'BAC',
       '[{"student_id": "b0350000-0000-4000-8000-000000000011", "table_number": "1234"}]') $$,
  '42501', null, 'un enseignant ne saisit pas les candidats'
);

select set_config('request.jwt.claims', '{"sub": "4f350000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.save_exam_candidates('3f350000-0000-4000-8000-000000000010', 'BAC',
       '[{"student_id": "b0350000-0000-4000-8000-000000000012", "table_number": "9999"}]') $$,
  'P0001', 'notCandidate', 'un élève de Première n''est pas candidat au BAC'
);
select is(
  public.save_exam_candidates('3f350000-0000-4000-8000-000000000010', 'BAC',
    '[{"student_id": "b0350000-0000-4000-8000-000000000011", "table_number": "1234", "center": "Lycée Blaise Diagne"}]'),
  1, 'le censeur inscrit le numéro de table et le centre'
);
select is(
  (select count(*)::integer from public.notifications where kind = 'examResult'),
  0, 'rien n''est notifié tant que le résultat est en attente'
);
select throws_ok(
  $$ select public.save_exam_candidates('3f350000-0000-4000-8000-000000000010', 'BAC',
       '[{"student_id": "b0350000-0000-4000-8000-000000000011", "result": "failed", "mention": "bien"}]') $$,
  '23514', null, 'pas de mention pour un ajourné'
);
select public.save_exam_candidates('3f350000-0000-4000-8000-000000000010', 'BAC',
  '[{"student_id": "b0350000-0000-4000-8000-000000000011", "table_number": "1234", "center": "Lycée Blaise Diagne", "result": "admitted", "mention": "bien"}]');

reset role;
select is(
  (select params ->> 'mention' from public.notifications where kind = 'examResult' and user_id = '4f350000-0000-4000-8000-000000000013'),
  'bien', 'le parent est notifié du résultat et de la mention'
);
select isnt(
  (select result_at from public.exam_candidates where student_id = 'b0350000-0000-4000-8000-000000000011'),
  null, 'la date du résultat est notée'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f350000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is(
  (select table_number from public.exam_candidates where student_id = 'b0350000-0000-4000-8000-000000000011'),
  '1234', 'le parent voit la convocation de son enfant'
);
select set_config('request.jwt.claims', '{"sub": "4f350000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select is((select count(*)::integer from public.exam_candidates), 0, 'un autre parent ne voit rien');

select * from finish();
rollback;
