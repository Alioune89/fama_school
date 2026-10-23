-- Notes : saisie idempotente de la feuille, la plus récente l'emporte, barème, droits, publication aux parents.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into public.schools (id, name, slug) values ('3a000000-0000-4000-8000-000000000010', 'École Test N', 'ecole-test-n');
insert into auth.users (id, aud, role, email) values
  ('4a000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'maths.n@test.local'),
  ('4a000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.n@test.local'),
  ('4a000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.n@test.local'),
  ('4a000000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'maitresse.n@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3a000000-0000-4000-8000-000000000010', '4a000000-0000-4000-8000-000000000011', 'teacher'),
  ('3a000000-0000-4000-8000-000000000010', '4a000000-0000-4000-8000-000000000012', 'teacher'),
  ('3a000000-0000-4000-8000-000000000010', '4a000000-0000-4000-8000-000000000013', 'parent'),
  ('3a000000-0000-4000-8000-000000000010', '4a000000-0000-4000-8000-000000000014', 'teacher');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5b000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on) values
  ('5c000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000011', 1, '1er semestre', current_date - 60, current_date + 60);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6a000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2),
  ('6a000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', 'prescolaire', 'Préscolaire', 'appreciation', 0);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7b000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', '6a000000-0000-4000-8000-000000000011', '6e', 'Sixième', 7),
  ('7b000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', '6a000000-0000-4000-8000-000000000012', 'GS', 'Grande section', 1);
insert into public.subjects (id, school_id, name) values
  ('7c000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', 'Mathématiques'),
  ('7c000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', 'Langage');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('3a000000-0000-4000-8000-000000000010', '7b000000-0000-4000-8000-000000000011', '7c000000-0000-4000-8000-000000000011', 4),
  ('3a000000-0000-4000-8000-000000000010', '7b000000-0000-4000-8000-000000000012', '7c000000-0000-4000-8000-000000000012', 1);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('8a000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', 'Prof Maths', 'maths.n@test.local', 'teacher', '4a000000-0000-4000-8000-000000000011'),
  ('8a000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', 'Autre Prof', 'autre.n@test.local', 'teacher', '4a000000-0000-4000-8000-000000000012'),
  ('8a000000-0000-4000-8000-000000000014', '3a000000-0000-4000-8000-000000000010', 'Maîtresse GS', 'maitresse.n@test.local', 'teacher', '4a000000-0000-4000-8000-000000000014');
insert into public.classes (id, school_id, academic_year_id, level_id, name, homeroom_staff_id) values
  ('9a000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000011', '7b000000-0000-4000-8000-000000000011', '6e A', null),
  ('9a000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', '5b000000-0000-4000-8000-000000000011', '7b000000-0000-4000-8000-000000000012', 'GS A', '8a000000-0000-4000-8000-000000000014');
insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id) values
  ('3a000000-0000-4000-8000-000000000010', '9a000000-0000-4000-8000-000000000011', '7c000000-0000-4000-8000-000000000011', '8a000000-0000-4000-8000-000000000011');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('ab000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', 'N-001', 'Awa', 'Diop', 'F'),
  ('ab000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', 'N-002', 'Modou', 'Fall', 'M'),
  ('ab000000-0000-4000-8000-000000000013', '3a000000-0000-4000-8000-000000000010', 'N-003', 'Ndeye', 'Sy', 'F'),
  ('ab000000-0000-4000-8000-000000000014', '3a000000-0000-4000-8000-000000000010', 'N-004', 'Petit', 'Ba', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3a000000-0000-4000-8000-000000000010', 'ab000000-0000-4000-8000-000000000011', '9a000000-0000-4000-8000-000000000011', '5b000000-0000-4000-8000-000000000011'),
  ('3a000000-0000-4000-8000-000000000010', 'ab000000-0000-4000-8000-000000000012', '9a000000-0000-4000-8000-000000000011', '5b000000-0000-4000-8000-000000000011'),
  ('3a000000-0000-4000-8000-000000000010', 'ab000000-0000-4000-8000-000000000013', '9a000000-0000-4000-8000-000000000011', '5b000000-0000-4000-8000-000000000011'),
  ('3a000000-0000-4000-8000-000000000010', 'ab000000-0000-4000-8000-000000000014', '9a000000-0000-4000-8000-000000000012', '5b000000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('ca000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', 'Parent Diop', '4a000000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3a000000-0000-4000-8000-000000000010', 'ab000000-0000-4000-8000-000000000011', 'ca000000-0000-4000-8000-000000000011', true);
insert into public.evaluations (id, school_id, class_id, subject_id, period_id, kind, title, held_on) values
  ('ea000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', '9a000000-0000-4000-8000-000000000011',
   '7c000000-0000-4000-8000-000000000011', '5c000000-0000-4000-8000-000000000011', 'devoir', 'Devoir n° 1', current_date),
  ('ea000000-0000-4000-8000-000000000012', '3a000000-0000-4000-8000-000000000010', '9a000000-0000-4000-8000-000000000012',
   '7c000000-0000-4000-8000-000000000012', '5c000000-0000-4000-8000-000000000011', 'devoir', 'Comptine', current_date);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

select is(
  public.submit_grades('fa000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000011', now() - interval '10 minutes',
    '{"ab000000-0000-4000-8000-000000000011": {"status": "graded", "score": 14.5},
      "ab000000-0000-4000-8000-000000000012": {"status": "absent"},
      "ab000000-0000-4000-8000-000000000013": {"status": "graded", "score": 9}}'),
  'applied',
  'le professeur de maths enregistre les notes de son devoir'
);
select is(
  public.submit_grades('fa000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000011', now() - interval '10 minutes', '{}'),
  'duplicate',
  'une feuille renvoyée par le téléphone n''est comptée qu''une fois'
);
select is(
  public.submit_grades('fa000000-0000-4000-8000-000000000002', 'ea000000-0000-4000-8000-000000000011', now() - interval '20 minutes', '{}'),
  'stale',
  'une saisie plus ancienne reçue en retard ne remplace pas la plus récente'
);
select results_eq(
  $$ select student_id, status::text, score from public.grades order by student_id $$,
  $$ values ('ab000000-0000-4000-8000-000000000011'::uuid, 'graded', 14.50::numeric),
            ('ab000000-0000-4000-8000-000000000012'::uuid, 'absent', null),
            ('ab000000-0000-4000-8000-000000000013'::uuid, 'graded', 9.00::numeric) $$,
  'une note, un absent, une note'
);
select is(
  public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000011', now() - interval '5 minutes',
    '{"ab000000-0000-4000-8000-000000000011": {"status": "graded", "score": 15.125},
      "ab000000-0000-4000-8000-000000000012": {"status": "excused"}}'),
  'applied',
  'le professeur corrige sa feuille'
);
select results_eq(
  $$ select student_id, status::text, score from public.grades order by student_id $$,
  $$ values ('ab000000-0000-4000-8000-000000000011'::uuid, 'graded', 15.13::numeric),
            ('ab000000-0000-4000-8000-000000000012'::uuid, 'excused', null) $$,
  'note arrondie au centième, absence excusée, note effacée pour l''élève retiré de la feuille'
);
select throws_ok(
  $$ select public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000011', now(),
       '{"ab000000-0000-4000-8000-000000000011": {"status": "graded", "score": 21}}') $$,
  'P0001', 'invalidGrade',
  'une note au-dessus du barème est refusée'
);
select throws_ok(
  $$ select public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000011', now(),
       '{"ab000000-0000-4000-8000-000000000011": {"status": "graded"}}') $$,
  'P0001', 'invalidGrade',
  'une note sans valeur est refusée'
);
select throws_ok(
  $$ update public.evaluations set max_score = 10 where id = 'ea000000-0000-4000-8000-000000000011' $$,
  'P0001', 'maxBelowScores',
  'le barème ne descend pas sous une note déjà saisie'
);
select throws_ok(
  $$ insert into public.grades (evaluation_id, school_id, student_id, status, score)
     values ('ea000000-0000-4000-8000-000000000011', '3a000000-0000-4000-8000-000000000010', 'ab000000-0000-4000-8000-000000000013', 'graded', 20) $$,
  '42501', null,
  'une note ne s''écrit pas directement'
);

-- Un autre professeur ne note pas cette matière.
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000011', now(), '{}') $$,
  'P0001', 'unknownEvaluation',
  'un professeur hors de la classe ne voit pas l''évaluation'
);

-- Préscolaire : la titulaire évalue en niveaux d'acquisition.
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select is(
  public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000012', now(),
    '{"ab000000-0000-4000-8000-000000000014": {"status": "graded", "acquisition": "in_progress"}}'),
  'applied',
  'la titulaire de grande section note « en cours d''acquisition »'
);
select throws_ok(
  $$ select public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000012', now(),
       '{"ab000000-0000-4000-8000-000000000014": {"status": "graded", "score": 8}}') $$,
  'P0001', 'invalidGrade',
  'pas de note chiffrée au préscolaire'
);

-- Le parent ne voit les notes qu'après publication, et seulement celles de son enfant.
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is_empty(
  $$ select 1 from public.grades union all select 1 from public.evaluations $$,
  'avant publication, le parent ne voit ni l''évaluation ni la note'
);
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
update public.evaluations set published_at = now() where id = 'ea000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select results_eq(
  $$ select student_id, score from public.grades $$,
  $$ values ('ab000000-0000-4000-8000-000000000011'::uuid, 15.13::numeric) $$,
  'après publication, le parent voit la note de son enfant, pas celles des autres'
);
select results_eq(
  $$ select title from public.evaluations $$,
  $$ values ('Devoir n° 1'::text) $$,
  'et l''évaluation publiée de sa classe'
);

-- Période verrouillée : plus aucune saisie.
reset role;
update public.periods set locked_at = now() where id = '5c000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4a000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.submit_grades(gen_random_uuid(), 'ea000000-0000-4000-8000-000000000011', now(), '{}') $$,
  'P0001', 'periodLocked',
  'les notes d''une période verrouillée ne changent plus'
);
select results_eq(
  $$ select count(*)::int from public.grades where evaluation_id = 'ea000000-0000-4000-8000-000000000011' $$,
  $$ values (2) $$,
  'les notes restent intactes'
);

select * from finish();
rollback;
