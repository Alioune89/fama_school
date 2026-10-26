-- Vérification publique des bulletins : code saisi librement, éléments clés seulement, limites d'essais.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into public.schools (id, name, slug) values ('3e000000-0000-4000-8000-000000000010', 'École Test R', 'ecole-test-r');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f400000-0000-4000-8000-000000000011', '3e000000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on, locked_at) values
  ('5f500000-0000-4000-8000-000000000011', '3e000000-0000-4000-8000-000000000010', '5f400000-0000-4000-8000-000000000011', 1, '1er semestre', current_date - 60, current_date + 60, now());
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6e000000-0000-4000-8000-000000000011', '3e000000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f200000-0000-4000-8000-000000000011', '3e000000-0000-4000-8000-000000000010', '6e000000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9e000000-0000-4000-8000-000000000011', '3e000000-0000-4000-8000-000000000010', '5f400000-0000-4000-8000-000000000011', '7f200000-0000-4000-8000-000000000011', '6e A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('af000000-0000-4000-8000-000000000011', '3e000000-0000-4000-8000-000000000010', 'R-001', 'Awa', 'Diop', 'F'),
  ('af000000-0000-4000-8000-000000000012', '3e000000-0000-4000-8000-000000000010', 'R-002', 'Modou', 'Fall', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3e000000-0000-4000-8000-000000000010', 'af000000-0000-4000-8000-000000000011', '9e000000-0000-4000-8000-000000000011', '5f400000-0000-4000-8000-000000000011'),
  ('3e000000-0000-4000-8000-000000000010', 'af000000-0000-4000-8000-000000000012', '9e000000-0000-4000-8000-000000000011', '5f400000-0000-4000-8000-000000000011');
insert into public.report_cards (school_id, class_id, period_id, student_id, code, data) values
  ('3e000000-0000-4000-8000-000000000010', '9e000000-0000-4000-8000-000000000011', '5f500000-0000-4000-8000-000000000011',
   'af000000-0000-4000-8000-000000000011', 'ABCDE23456',
   '{"version": 1, "student": {"firstName": "Awa", "lastName": "Diop", "matricule": "R-001"}, "className": "6e A",
     "periodLabel": "1er semestre", "academicYear": "2026-2027", "scale": "twenty", "general": 14.25,
     "rank": {"rank": 2, "exAequo": false}, "classSize": 31, "mention": "encouragements", "mentionWithheld": false,
     "absences": {"absent": 3, "late": 0}}'),
  ('3e000000-0000-4000-8000-000000000010', '9e000000-0000-4000-8000-000000000011', '5f500000-0000-4000-8000-000000000011',
   'af000000-0000-4000-8000-000000000012', 'ZZZZZ99999',
   '{"version": 1, "student": {"firstName": "Modou", "lastName": "Fall", "matricule": "R-002"}, "general": 16.5,
     "mention": "felicitations", "mentionWithheld": true}');

set local role anon;

select is(
  public.verify_report_card('ABCDE23456', '198.51.100.7') - 'generatedAt',
  '{"status": "valid", "kind": "reportCard", "code": "ABCDE23456", "school": "École Test R",
    "student": {"firstName": "Awa", "lastName": "Diop", "matricule": "R-001"}, "className": "6e A",
    "periodLabel": "1er semestre", "academicYear": "2026-2027", "scale": "twenty", "general": 14.25,
    "rank": {"rank": 2, "exAequo": false}, "classSize": 31, "mention": "encouragements"}'::jsonb,
  'un visiteur sans compte vérifie un bulletin : éléments clés seulement (ni notes ni absences)'
);
select is(
  public.verify_report_card(' abcde-23456 ', '198.51.100.7') ->> 'status',
  'valid',
  'le code se saisit en minuscules, avec espaces ou tirets'
);
select is(
  public.verify_report_card('ZZZZZ99999', '198.51.100.7') -> 'mention',
  'null'::jsonb,
  'une mention refusée par le conseil n''apparaît pas'
);
select is(
  public.verify_report_card('ABCDE23457', '198.51.100.7') ->> 'status',
  'notFound',
  'un code inconnu est signalé'
);
select is(
  public.verify_report_card('<script>', '198.51.100.7') ->> 'status',
  'notFound',
  'un code mal formé aussi'
);

-- 20 essais par visiteur et par 10 minutes : déjà 5, encore 15.
select is(
  (select count(*)::int from generate_series(1, 15) where public.verify_report_card('ABCDE23456', '198.51.100.7') ->> 'status' = 'valid'),
  15,
  'jusqu''à 20 essais par visiteur'
);
select is(
  public.verify_report_card('ABCDE23456', '198.51.100.7') ->> 'status',
  'tooManyAttempts',
  'au-delà, le visiteur doit patienter'
);
select is(
  public.verify_report_card('ABCDE23456', '203.0.113.9') ->> 'status',
  'valid',
  'un autre visiteur n''est pas bloqué'
);

select throws_ok(
  $$ select 1 from private.verification_attempts $$,
  '42501', null,
  'les essais ne se lisent pas'
);

select * from finish();
rollback;
