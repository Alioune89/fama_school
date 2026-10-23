-- Verrouillage des périodes et conseil de classe : qui verrouille, qui déverrouille, décisions par élève.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into public.schools (id, name, slug) values ('3c000000-0000-4000-8000-000000000010', 'École Test P', 'ecole-test-p');
insert into auth.users (id, aud, role, email) values
  ('4c000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'censeur.p@test.local'),
  ('4c000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'directeur.p@test.local'),
  ('4c000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'titulaire.p@test.local'),
  ('4c000000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'autre.p@test.local'),
  ('4c000000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'parent.p@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3c000000-0000-4000-8000-000000000010', '4c000000-0000-4000-8000-000000000011', 'censor'),
  ('3c000000-0000-4000-8000-000000000010', '4c000000-0000-4000-8000-000000000012', 'director'),
  ('3c000000-0000-4000-8000-000000000010', '4c000000-0000-4000-8000-000000000013', 'teacher'),
  ('3c000000-0000-4000-8000-000000000010', '4c000000-0000-4000-8000-000000000014', 'teacher'),
  ('3c000000-0000-4000-8000-000000000010', '4c000000-0000-4000-8000-000000000015', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f000000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on) values
  ('5f100000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', '5f000000-0000-4000-8000-000000000011', 1, '1er semestre', current_date - 60, current_date + 60);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6c000000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', 'elementaire', 'Élémentaire', 'ten', 1);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f000000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', '6c000000-0000-4000-8000-000000000011', 'CM2', 'Cours moyen 2', 6);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('8c000000-0000-4000-8000-000000000013', '3c000000-0000-4000-8000-000000000010', 'Titulaire CM2', 'titulaire.p@test.local', 'teacher', '4c000000-0000-4000-8000-000000000013'),
  ('8c000000-0000-4000-8000-000000000014', '3c000000-0000-4000-8000-000000000010', 'Autre', 'autre.p@test.local', 'teacher', '4c000000-0000-4000-8000-000000000014');
insert into public.classes (id, school_id, academic_year_id, level_id, name, homeroom_staff_id) values
  ('9c000000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', '5f000000-0000-4000-8000-000000000011', '7f000000-0000-4000-8000-000000000011', 'CM2 A', '8c000000-0000-4000-8000-000000000013'),
  ('9c000000-0000-4000-8000-000000000012', '3c000000-0000-4000-8000-000000000010', '5f000000-0000-4000-8000-000000000011', '7f000000-0000-4000-8000-000000000011', 'CM2 B', '8c000000-0000-4000-8000-000000000014');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('ad000000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', 'P-001', 'Awa', 'Diop', 'F'),
  ('ad000000-0000-4000-8000-000000000012', '3c000000-0000-4000-8000-000000000010', 'P-002', 'Modou', 'Fall', 'M'),
  ('ad000000-0000-4000-8000-000000000013', '3c000000-0000-4000-8000-000000000010', 'P-003', 'Autre', 'Classe', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3c000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000011', '9c000000-0000-4000-8000-000000000011', '5f000000-0000-4000-8000-000000000011'),
  ('3c000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000012', '9c000000-0000-4000-8000-000000000011', '5f000000-0000-4000-8000-000000000011'),
  ('3c000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000013', '9c000000-0000-4000-8000-000000000012', '5f000000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cc000000-0000-4000-8000-000000000011', '3c000000-0000-4000-8000-000000000010', 'Parent Diop', '4c000000-0000-4000-8000-000000000015');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3c000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000011', 'cc000000-0000-4000-8000-000000000011', true);

set local role authenticated;

-- Conseil de classe : la titulaire de la CM2 A.
select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_council_decisions('9c000000-0000-4000-8000-000000000011', '5f100000-0000-4000-8000-000000000011',
       '{"ad000000-0000-4000-8000-000000000011": {"sanction": null, "withholdMention": false, "appreciation": " Élève sérieuse. "},
         "ad000000-0000-4000-8000-000000000012": {"sanction": "warning", "withholdMention": true, "appreciation": ""}}') $$,
  'la titulaire enregistre les décisions du conseil de sa classe'
);
select results_eq(
  $$ select student_id, sanction::text, withhold_mention, general_appreciation from public.council_decisions order by student_id $$,
  $$ values ('ad000000-0000-4000-8000-000000000011'::uuid, null::text, false, 'Élève sérieuse.'::text),
            ('ad000000-0000-4000-8000-000000000012'::uuid, 'warning', true, null) $$,
  'appréciation générale nettoyée, avertissement et mention refusée'
);
select lives_ok(
  $$ select public.save_council_decisions('9c000000-0000-4000-8000-000000000011', '5f100000-0000-4000-8000-000000000011',
       '{"ad000000-0000-4000-8000-000000000012": {"sanction": null, "withholdMention": false, "appreciation": ""}}') $$,
  'elle retire l''avertissement'
);
select results_eq(
  $$ select count(*)::int from public.council_decisions $$,
  $$ values (1) $$,
  'une décision vide est effacée'
);
select throws_ok(
  $$ select public.save_council_decisions('9c000000-0000-4000-8000-000000000011', '5f100000-0000-4000-8000-000000000011',
       '{"ad000000-0000-4000-8000-000000000013": {"sanction": "blame"}}') $$,
  'P0001', 'unknownStudent',
  'pas de décision pour un élève d''une autre classe'
);

-- Un autre enseignant ne tient pas le conseil de la CM2 A ; le parent ne lit pas les décisions.
select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.save_council_decisions('9c000000-0000-4000-8000-000000000011', '5f100000-0000-4000-8000-000000000011',
       '{"ad000000-0000-4000-8000-000000000011": {"sanction": "blame"}}') $$,
  'P0001', 'forbidden',
  'un enseignant d''une autre classe ne pose pas de sanction'
);
select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000015", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.council_decisions $$, 'le parent ne lit pas les décisions avant le bulletin');

-- Verrouillage : l'enseignant ne verrouille pas ; le censeur verrouille mais ne déverrouille pas.
select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.set_period_lock('5f100000-0000-4000-8000-000000000011', true) $$,
  'P0001', 'forbidden',
  'un enseignant ne verrouille pas la période'
);
select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select throws_ok(
  $$ update public.periods set locked_at = now() where id = '5f100000-0000-4000-8000-000000000011' $$,
  '42501', null,
  'le verrou ne s''écrit pas directement'
);
select lives_ok(
  $$ select public.set_period_lock('5f100000-0000-4000-8000-000000000011', true) $$,
  'le censeur verrouille la période'
);
select throws_ok(
  $$ update public.periods set ends_on = ends_on + 1 where id = '5f100000-0000-4000-8000-000000000011' $$,
  'P0001', 'periodLocked',
  'une période verrouillée garde ses dates'
);
select throws_ok(
  $$ select public.set_period_lock('5f100000-0000-4000-8000-000000000011', false) $$,
  'P0001', 'forbidden',
  'le censeur ne déverrouille pas'
);

select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.save_council_decisions('9c000000-0000-4000-8000-000000000011', '5f100000-0000-4000-8000-000000000011',
       '{"ad000000-0000-4000-8000-000000000011": {"sanction": "blame"}}') $$,
  'P0001', 'periodLocked',
  'les décisions d''une période verrouillée ne changent plus'
);

select set_config('request.jwt.claims', '{"sub": "4c000000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select public.set_period_lock('5f100000-0000-4000-8000-000000000011', false);
select results_eq(
  $$ select locked_at, locked_by from public.periods where id = '5f100000-0000-4000-8000-000000000011' $$,
  $$ values (null::timestamptz, null::uuid) $$,
  'le directeur déverrouille la période'
);

select * from finish();
rollback;
