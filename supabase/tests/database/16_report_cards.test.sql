-- Bulletins : génération sur période verrouillée, code de vérification, droits, publication aux parents.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into public.schools (id, name, slug) values ('3d000000-0000-4000-8000-000000000010', 'École Test Q', 'ecole-test-q');
insert into auth.users (id, aud, role, email) values
  ('4d000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'censeur.q@test.local'),
  ('4d000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.q@test.local'),
  ('4d000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.q@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3d000000-0000-4000-8000-000000000010', '4d000000-0000-4000-8000-000000000011', 'censor'),
  ('3d000000-0000-4000-8000-000000000010', '4d000000-0000-4000-8000-000000000012', 'teacher'),
  ('3d000000-0000-4000-8000-000000000010', '4d000000-0000-4000-8000-000000000013', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f200000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on) values
  ('5f300000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', '5f200000-0000-4000-8000-000000000011', 1, '1er semestre', current_date - 60, current_date + 60);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6d000000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f100000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', '6d000000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9d000000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', '5f200000-0000-4000-8000-000000000011', '7f100000-0000-4000-8000-000000000011', '6e A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('ae000000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', 'Q-001', 'Awa', 'Diop', 'F'),
  ('ae000000-0000-4000-8000-000000000012', '3d000000-0000-4000-8000-000000000010', 'Q-002', 'Modou', 'Fall', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3d000000-0000-4000-8000-000000000010', 'ae000000-0000-4000-8000-000000000011', '9d000000-0000-4000-8000-000000000011', '5f200000-0000-4000-8000-000000000011'),
  ('3d000000-0000-4000-8000-000000000010', 'ae000000-0000-4000-8000-000000000012', '9d000000-0000-4000-8000-000000000011', '5f200000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cd000000-0000-4000-8000-000000000011', '3d000000-0000-4000-8000-000000000010', 'Parent Diop', '4d000000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3d000000-0000-4000-8000-000000000010', 'ae000000-0000-4000-8000-000000000011', 'cd000000-0000-4000-8000-000000000011', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4d000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.report_cards (school_id, class_id, period_id, student_id, data)
     values ('3d000000-0000-4000-8000-000000000010', '9d000000-0000-4000-8000-000000000011',
             '5f300000-0000-4000-8000-000000000011', 'ae000000-0000-4000-8000-000000000011', '{"version": 1}') $$,
  'P0001', 'periodNotLocked',
  'pas de bulletin tant que la période est ouverte'
);

select public.set_period_lock('5f300000-0000-4000-8000-000000000011', true);
select lives_ok(
  $$ insert into public.report_cards (school_id, class_id, period_id, student_id, data) values
       ('3d000000-0000-4000-8000-000000000010', '9d000000-0000-4000-8000-000000000011',
        '5f300000-0000-4000-8000-000000000011', 'ae000000-0000-4000-8000-000000000011', '{"version": 1, "general": 14.5}'),
       ('3d000000-0000-4000-8000-000000000010', '9d000000-0000-4000-8000-000000000011',
        '5f300000-0000-4000-8000-000000000011', 'ae000000-0000-4000-8000-000000000012', '{"version": 1, "general": 9}') $$,
  'le censeur génère les bulletins de la classe une fois la période verrouillée'
);
select ok(
  (select bool_and(code ~ '^[A-Z2-9]{10}$') and count(distinct code) = 2 and bool_and(generated_by = '4d000000-0000-4000-8000-000000000011')
   from public.report_cards),
  'chaque bulletin reçoit un code de vérification unique ; auteur enregistré'
);

create temporary table first_code on commit drop as
  select code from public.report_cards where student_id = 'ae000000-0000-4000-8000-000000000011';
grant select on first_code to authenticated;
select lives_ok(
  $$ update public.report_cards set data = '{"version": 1, "general": 15}' where student_id = 'ae000000-0000-4000-8000-000000000011' $$,
  'une nouvelle génération remplace le contenu'
);
select is(
  (select code from public.report_cards where student_id = 'ae000000-0000-4000-8000-000000000011'),
  (select code from first_code),
  'le code de vérification reste le même'
);
select throws_ok(
  $$ update public.report_cards set code = 'AAAAAAAAAA' $$,
  '42501', null,
  'le code ne se change pas'
);
select throws_ok(
  $$ insert into public.report_cards (school_id, class_id, period_id, student_id, data)
     values ('3d000000-0000-4000-8000-000000000010', '9d000000-0000-4000-8000-000000000011',
             '5f300000-0000-4000-8000-000000000011', 'ae000000-0000-4000-8000-000000000011', '{}') $$,
  '23505', null,
  'un seul bulletin par élève et par période'
);

-- L'enseignant de l'école ne génère pas les bulletins.
select set_config('request.jwt.claims', '{"sub": "4d000000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is_empty(
  $$ update public.report_cards set published_at = now() returning 1 $$,
  'un enseignant hors de la classe ne publie pas les bulletins'
);

-- Le parent ne voit que le bulletin publié de son enfant.
select set_config('request.jwt.claims', '{"sub": "4d000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.report_cards $$, 'avant publication, le parent ne voit pas le bulletin');
select set_config('request.jwt.claims', '{"sub": "4d000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
update public.report_cards set published_at = now();
select set_config('request.jwt.claims', '{"sub": "4d000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select results_eq(
  $$ select student_id, (data ->> 'general')::numeric from public.report_cards $$,
  $$ values ('ae000000-0000-4000-8000-000000000011'::uuid, 15::numeric) $$,
  'après publication, le parent voit le bulletin de son enfant seulement'
);

-- Régénération de la classe : le contenu change, le code et la publication restent.
select set_config('request.jwt.claims', '{"sub": "4d000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is(
  public.save_report_cards('9d000000-0000-4000-8000-000000000011', '5f300000-0000-4000-8000-000000000011',
    '{"ae000000-0000-4000-8000-000000000011": {"version": 1, "general": 16}, "ae000000-0000-4000-8000-000000000012": {"version": 1, "general": 10}}'),
  2,
  'le censeur régénère les bulletins de la classe'
);
select results_eq(
  $$ select code, (data ->> 'general')::numeric, published_at is not null from public.report_cards
     where student_id = 'ae000000-0000-4000-8000-000000000011' $$,
  $$ select code, 16::numeric, true from first_code $$,
  'même code, contenu à jour, toujours publié'
);

select * from finish();
rollback;
