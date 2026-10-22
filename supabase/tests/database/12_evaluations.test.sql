-- Évaluations : qui crée quoi, cohérence avec la classe et la période, barème, verrouillage.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

insert into public.schools (id, name, slug) values ('39000000-0000-4000-8000-000000000010', 'École Test M', 'ecole-test-m');
insert into auth.users (id, aud, role, email) values
  ('49000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'maths.m@test.local'),
  ('49000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'francais.m@test.local'),
  ('49000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'titulaire.m@test.local'),
  ('49000000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'censeur.m@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('39000000-0000-4000-8000-000000000010', '49000000-0000-4000-8000-000000000011', 'teacher'),
  ('39000000-0000-4000-8000-000000000010', '49000000-0000-4000-8000-000000000012', 'teacher'),
  ('39000000-0000-4000-8000-000000000010', '49000000-0000-4000-8000-000000000013', 'teacher'),
  ('39000000-0000-4000-8000-000000000010', '49000000-0000-4000-8000-000000000014', 'censor');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('59000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', '2026-2027', '2026-10-05', '2027-07-15', true),
  ('59000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', '2025-2026', '2025-10-05', '2026-07-15', false);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on, locked_at) values
  ('5a000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', '59000000-0000-4000-8000-000000000011', 1, '1er semestre', '2026-10-05', '2027-02-13', null),
  ('5a000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', '59000000-0000-4000-8000-000000000011', 2, '2e semestre', '2027-02-15', '2027-07-15', now()),
  ('5a000000-0000-4000-8000-000000000013', '39000000-0000-4000-8000-000000000010', '59000000-0000-4000-8000-000000000012', 1, '1er semestre', '2025-10-05', '2026-02-13', null);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('69000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', 'elementaire', 'Élémentaire', 'ten', 1),
  ('69000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('79000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', '69000000-0000-4000-8000-000000000011', 'CM2', 'Cours moyen 2', 6),
  ('79000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', '69000000-0000-4000-8000-000000000012', '6e', 'Sixième', 7);
insert into public.subjects (id, school_id, name) values
  ('7a000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', 'Mathématiques'),
  ('7a000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', 'Français'),
  ('7a000000-0000-4000-8000-000000000013', '39000000-0000-4000-8000-000000000010', 'Philosophie');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('39000000-0000-4000-8000-000000000010', '79000000-0000-4000-8000-000000000011', '7a000000-0000-4000-8000-000000000011', 1),
  ('39000000-0000-4000-8000-000000000010', '79000000-0000-4000-8000-000000000011', '7a000000-0000-4000-8000-000000000012', 1),
  ('39000000-0000-4000-8000-000000000010', '79000000-0000-4000-8000-000000000012', '7a000000-0000-4000-8000-000000000011', 4),
  ('39000000-0000-4000-8000-000000000010', '79000000-0000-4000-8000-000000000012', '7a000000-0000-4000-8000-000000000012', 4);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('89000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', 'Prof Maths', 'maths.m@test.local', 'teacher', '49000000-0000-4000-8000-000000000011'),
  ('89000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', 'Prof Français', 'francais.m@test.local', 'teacher', '49000000-0000-4000-8000-000000000012'),
  ('89000000-0000-4000-8000-000000000013', '39000000-0000-4000-8000-000000000010', 'Titulaire CM2', 'titulaire.m@test.local', 'teacher', '49000000-0000-4000-8000-000000000013');
insert into public.classes (id, school_id, academic_year_id, level_id, name, homeroom_staff_id) values
  ('99000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', '59000000-0000-4000-8000-000000000011', '79000000-0000-4000-8000-000000000011', 'CM2 A', '89000000-0000-4000-8000-000000000013'),
  ('99000000-0000-4000-8000-000000000012', '39000000-0000-4000-8000-000000000010', '59000000-0000-4000-8000-000000000011', '79000000-0000-4000-8000-000000000012', '6e A', '89000000-0000-4000-8000-000000000012');
insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id) values
  ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012', '7a000000-0000-4000-8000-000000000011', '89000000-0000-4000-8000-000000000011');

set local role authenticated;

-- Le professeur de maths de la 6e A.
select set_config('request.jwt.claims', '{"sub": "49000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.evaluations (id, school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('aa000000-0000-4000-8000-000000000011', '39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012',
             '7a000000-0000-4000-8000-000000000011', '5a000000-0000-4000-8000-000000000011', 'devoir', 'Devoir n° 1', '2026-11-10') $$,
  'le professeur de maths crée un devoir dans sa classe'
);
select results_eq(
  $$ select max_score, created_by from public.evaluations where id = 'aa000000-0000-4000-8000-000000000011' $$,
  $$ values (20.00::numeric, '49000000-0000-4000-8000-000000000011'::uuid) $$,
  'barème du cycle par défaut (sur 20 au moyen), auteur enregistré'
);
select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012',
             '7a000000-0000-4000-8000-000000000012', '5a000000-0000-4000-8000-000000000011', 'devoir', 'Dictée', '2026-11-10') $$,
  '42501', null,
  'pas d''évaluation dans une matière qu''il n''enseigne pas'
);
select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012',
             '7a000000-0000-4000-8000-000000000011', '5a000000-0000-4000-8000-000000000011', 'devoir', 'Hors période', '2027-03-01') $$,
  'P0001', 'dateOutsidePeriod',
  'la date doit être dans la période'
);
select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012',
             '7a000000-0000-4000-8000-000000000011', '5a000000-0000-4000-8000-000000000013', 'devoir', 'Mauvaise année', '2025-11-10') $$,
  'P0001', 'periodMismatch',
  'la période doit être de l''année de la classe'
);
select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012',
             '7a000000-0000-4000-8000-000000000011', '5a000000-0000-4000-8000-000000000012', 'devoir', 'Semestre clos', '2027-03-01') $$,
  'P0001', 'periodLocked',
  'aucune évaluation dans une période verrouillée'
);
select lives_ok(
  $$ update public.evaluations set title = 'Devoir surveillé n° 1', max_score = 10 where id = 'aa000000-0000-4000-8000-000000000011' $$,
  'il modifie son devoir (titre, barème sur 10)'
);
select throws_ok(
  $$ update public.evaluations set class_id = '99000000-0000-4000-8000-000000000011' where id = 'aa000000-0000-4000-8000-000000000011' $$,
  '42501', null,
  'la classe d''une évaluation ne change pas'
);

-- La titulaire du CM2 (élémentaire) note toutes les matières de sa classe, sur 10.
select set_config('request.jwt.claims', '{"sub": "49000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.evaluations (id, school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('aa000000-0000-4000-8000-000000000013', '39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000011',
             '7a000000-0000-4000-8000-000000000012', '5a000000-0000-4000-8000-000000000011', 'interrogation', 'Dictée', '2026-11-12') $$,
  'la titulaire du CM2 crée une dictée'
);
select is(
  (select max_score from public.evaluations where id = 'aa000000-0000-4000-8000-000000000013'),
  10.00::numeric,
  'barème sur 10 à l''élémentaire'
);
select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000011',
             '7a000000-0000-4000-8000-000000000013', '5a000000-0000-4000-8000-000000000011', 'devoir', 'Philo', '2026-11-12') $$,
  'P0001', 'subjectNotInLevel',
  'la matière doit être enseignée à ce niveau'
);

-- Le professeur principal de la 6e A (moyen) n'enseigne pas les maths : pas d'évaluation de maths.
select set_config('request.jwt.claims', '{"sub": "49000000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012',
             '7a000000-0000-4000-8000-000000000011', '5a000000-0000-4000-8000-000000000011', 'devoir', 'Maths', '2026-11-12') $$,
  '42501', null,
  'au moyen, le professeur principal ne note que ses matières'
);

-- Le censeur programme la composition de français des deux classes.
select set_config('request.jwt.claims', '{"sub": "49000000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on) values
       ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000011', '7a000000-0000-4000-8000-000000000012',
        '5a000000-0000-4000-8000-000000000011', 'composition', 'Composition du 1er semestre', '2027-02-02'),
       ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012', '7a000000-0000-4000-8000-000000000012',
        '5a000000-0000-4000-8000-000000000011', 'composition', 'Composition du 1er semestre', '2027-02-02') $$,
  'le censeur programme les compositions'
);
select is(
  (select count(*)::int from public.evaluations where kind = 'composition'),
  2,
  'la direction voit toutes les évaluations'
);

select throws_ok(
  $$ insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on)
     values ('39000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000012', '7a000000-0000-4000-8000-000000000012',
             '5a000000-0000-4000-8000-000000000011', 'composition', 'Doublon', '2027-02-03') $$,
  '23505', null,
  'une seule composition par classe, matière et période'
);

select * from finish();
rollback;
