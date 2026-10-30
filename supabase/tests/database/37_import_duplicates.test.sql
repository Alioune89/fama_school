-- Import d'élèves : un élève déjà inscrit (ou présent deux fois dans le fichier) n'est pas recréé,
-- sauf « Importer quand même » ; les homonymes nés un autre jour passent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into public.schools (id, name, slug) values ('3f370000-0000-4000-8000-000000000010', 'École Test D', 'ecole-test-doublons');
insert into auth.users (id, aud, role, email) values
  ('4f370000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'directeur.d@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f370000-0000-4000-8000-000000000010', '4f370000-0000-4000-8000-000000000011', 'director');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f370000-0000-4000-8000-000000000011', '3f370000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f370000-0000-4000-8000-000000000011', '3f370000-0000-4000-8000-000000000010', 'elementaire', 'Élémentaire', 'ten', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f370000-0000-4000-8000-000000000011', '3f370000-0000-4000-8000-000000000010', '6f370000-0000-4000-8000-000000000011', 'CM2', 'CM2', 6),
  ('7f370000-0000-4000-8000-000000000012', '3f370000-0000-4000-8000-000000000010', '6f370000-0000-4000-8000-000000000011', 'CM1', 'CM1', 5);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f370000-0000-4000-8000-000000000011', '3f370000-0000-4000-8000-000000000010', '5f370000-0000-4000-8000-000000000011', '7f370000-0000-4000-8000-000000000011', 'CM2 A'),
  ('9f370000-0000-4000-8000-000000000012', '3f370000-0000-4000-8000-000000000010', '5f370000-0000-4000-8000-000000000011', '7f370000-0000-4000-8000-000000000012', 'CM1 A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex, birth_date) values
  ('b0370000-0000-4000-8000-000000000011', '3f370000-0000-4000-8000-000000000010', 'D-001', 'Aïda', 'Diop', 'F', '2015-03-14'),
  ('b0370000-0000-4000-8000-000000000012', '3f370000-0000-4000-8000-000000000010', 'D-002', 'Malick', 'Sy', 'M', null);
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f370000-0000-4000-8000-000000000010', 'b0370000-0000-4000-8000-000000000011', '9f370000-0000-4000-8000-000000000011', '5f370000-0000-4000-8000-000000000011'),
  ('3f370000-0000-4000-8000-000000000010', 'b0370000-0000-4000-8000-000000000012', '9f370000-0000-4000-8000-000000000011', '5f370000-0000-4000-8000-000000000011');

create temp table results (step text primary key, result jsonb);
grant all on results to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f370000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

-- Même élève, écrit autrement, même date de naissance, autre classe.
insert into results select 'same', public.import_students('3f370000-0000-4000-8000-000000000010', '[
  {"row": 2, "class_name": "CM1 A", "student": {"first_name": "AIDA", "last_name": " diop ", "sex": "F", "birth_date": "2015-03-14"}, "guardians": []}
]'::jsonb);
-- Le même, coché « Importer quand même » (homonyme).
insert into results select 'allowed', public.import_students('3f370000-0000-4000-8000-000000000010', '[
  {"row": 2, "class_name": "CM1 A", "allow_duplicate": true, "student": {"first_name": "Aida", "last_name": "Diop", "sex": "F", "birth_date": "2015-03-14"}, "guardians": []}
]'::jsonb);
-- Sans date de naissance : doublon dans la même classe seulement.
insert into results select 'noDateSameClass', public.import_students('3f370000-0000-4000-8000-000000000010', '[
  {"row": 3, "class_name": "CM2 A", "student": {"first_name": "Malick", "last_name": "Sy", "sex": "M", "birth_date": null}, "guardians": []}
]'::jsonb);
insert into results select 'noDateOtherClass', public.import_students('3f370000-0000-4000-8000-000000000010', '[
  {"row": 3, "class_name": "CM1 A", "student": {"first_name": "Malick", "last_name": "Sy", "sex": "M", "birth_date": null}, "guardians": []}
]'::jsonb);
-- Homonyme né un autre jour : un autre enfant.
insert into results select 'homonym', public.import_students('3f370000-0000-4000-8000-000000000010', '[
  {"row": 4, "class_name": "CM2 A", "student": {"first_name": "Aïda", "last_name": "Diop", "sex": "F", "birth_date": "2016-01-02"}, "guardians": []}
]'::jsonb);
-- Le même élève deux fois dans un fichier.
insert into results select 'twiceInFile', public.import_students('3f370000-0000-4000-8000-000000000010', '[
  {"row": 5, "class_name": "CM1 A", "student": {"first_name": "Fatou", "last_name": "Ndiaye", "sex": "F", "birth_date": "2016-05-05"}, "guardians": []},
  {"row": 6, "class_name": "CM1 A", "student": {"first_name": "Fatou", "last_name": "Ndiaye", "sex": "F", "birth_date": "2016-05-05"}, "guardians": []}
]'::jsonb);

select is((select result from results where step = 'same'),
  '{"imported": 0, "errors": [{"row": 2, "code": "duplicateStudent"}]}'::jsonb,
  'même élève (casse, accents, espaces) : refusé');
select is((select result ->> 'imported' from results where step = 'allowed'), '1', '« Importer quand même » : accepté');
select is((select result -> 'errors' -> 0 ->> 'code' from results where step = 'noDateSameClass'), 'duplicateStudent',
  'sans date de naissance, même classe : refusé');
select is((select result ->> 'imported' from results where step = 'noDateOtherClass'), '1',
  'sans date de naissance, autre classe : accepté');
select is((select result ->> 'imported' from results where step = 'homonym'), '1', 'homonyme né un autre jour : accepté');
select is((select result from results where step = 'twiceInFile'),
  '{"imported": 1, "errors": [{"row": 6, "code": "duplicateStudent"}]}'::jsonb,
  'deux fois dans le fichier : un seul élève créé');
select is(
  (select count(*)::int from public.students where school_id = '3f370000-0000-4000-8000-000000000010'),
  6,
  '2 élèves au départ + 4 importés'
);
select is(private.name_key('  NDÈYE   Fatou '), 'ndeye fatou', 'clé de nom : minuscules, sans accents ni espaces en trop');

select * from finish();
rollback;
