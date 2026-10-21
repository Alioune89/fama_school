-- Signalements : droits, idempotence, nom de l'auteur, visibilité par les parents.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.schools (id, name, slug) values ('36000000-0000-4000-8000-00000000000d', 'École Test J', 'ecole-test-j');
insert into auth.users (id, aud, role, email) values
  ('46000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'prof.j@test.local'),
  ('46000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'autre.prof.j@test.local'),
  ('46000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', 'parent.j@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('36000000-0000-4000-8000-00000000000d', '46000000-0000-4000-8000-0000000000d1', 'teacher'),
  ('36000000-0000-4000-8000-00000000000d', '46000000-0000-4000-8000-0000000000d2', 'teacher'),
  ('36000000-0000-4000-8000-00000000000d', '46000000-0000-4000-8000-0000000000d4', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('56000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', '2026-2027', '2026-10-01', '2027-07-31', true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('66000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', 'elementaire', 'Élémentaire', 'ten', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('76000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', '66000000-0000-4000-8000-0000000000d1', 'CM2', 'Cours moyen 2', 6);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('86000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', 'Fatou Titulaire', 'prof.j@test.local', 'teacher', '46000000-0000-4000-8000-0000000000d1'),
  ('86000000-0000-4000-8000-0000000000d2', '36000000-0000-4000-8000-00000000000d', 'Autre Prof', 'autre.prof.j@test.local', 'teacher', '46000000-0000-4000-8000-0000000000d2');
insert into public.classes (id, school_id, academic_year_id, level_id, name, homeroom_staff_id) values
  ('96000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', '56000000-0000-4000-8000-0000000000d1', '76000000-0000-4000-8000-0000000000d1', 'CM2 A', '86000000-0000-4000-8000-0000000000d1');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('a6000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', 'J-001', 'Awa', 'Ndiaye', 'F'),
  ('a6000000-0000-4000-8000-0000000000d2', '36000000-0000-4000-8000-00000000000d', 'J-002', 'Pape', 'Gaye', 'M'),
  ('a6000000-0000-4000-8000-0000000000d3', '36000000-0000-4000-8000-00000000000d', 'J-003', 'Hors', 'Classe', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('36000000-0000-4000-8000-00000000000d', 'a6000000-0000-4000-8000-0000000000d1', '96000000-0000-4000-8000-0000000000d1', '56000000-0000-4000-8000-0000000000d1'),
  ('36000000-0000-4000-8000-00000000000d', 'a6000000-0000-4000-8000-0000000000d2', '96000000-0000-4000-8000-0000000000d1', '56000000-0000-4000-8000-0000000000d1');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('c6000000-0000-4000-8000-0000000000d1', '36000000-0000-4000-8000-00000000000d', 'Parent Ndiaye', '46000000-0000-4000-8000-0000000000d4');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('36000000-0000-4000-8000-00000000000d', 'a6000000-0000-4000-8000-0000000000d1', 'c6000000-0000-4000-8000-0000000000d1', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "46000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);

select is(
  public.submit_student_report('e6000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-0000000000d1',
    '96000000-0000-4000-8000-0000000000d1', 'health', 'Fièvre en milieu de matinée, l''infirmière a été prévenue.', now() - interval '10 minutes'),
  'applied',
  'la titulaire signale une élève de sa classe'
);

select is(
  public.submit_student_report('e6000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-0000000000d1',
    '96000000-0000-4000-8000-0000000000d1', 'health', 'Fièvre en milieu de matinée, l''infirmière a été prévenue.', now()),
  'duplicate',
  'un signalement renvoyé par le téléphone n''est enregistré qu''une fois'
);

select results_eq(
  $$ select author_name, category::text, (select count(*)::int from public.student_reports) from public.student_reports $$,
  $$ values ('Fatou Titulaire'::text, 'health'::text, 1) $$,
  'le signalement garde le nom de l''enseignante, lisible par les parents'
);

select lives_ok(
  $$ select public.submit_student_report(gen_random_uuid(), 'a6000000-0000-4000-8000-0000000000d2',
       '96000000-0000-4000-8000-0000000000d1', 'homework', 'Exercices de calcul non faits.', now()) $$,
  'un deuxième signalement, pour un autre élève'
);

select throws_ok(
  $$ select public.submit_student_report(gen_random_uuid(), 'a6000000-0000-4000-8000-0000000000d1',
       '96000000-0000-4000-8000-0000000000d1', 'other', '  ', now()) $$,
  'P0001', 'invalidMessage',
  'un motif est obligatoire'
);

select throws_ok(
  $$ select public.submit_student_report(gen_random_uuid(), 'a6000000-0000-4000-8000-0000000000d3',
       '96000000-0000-4000-8000-0000000000d1', 'other', 'Élève d''une autre classe', now()) $$,
  'P0001', 'unknownStudent',
  'l''élève doit être inscrit dans la classe'
);

select throws_ok(
  $$ insert into public.student_reports (id, school_id, student_id, class_id, category, message, occurred_at, author_name)
     values (gen_random_uuid(), '36000000-0000-4000-8000-00000000000d', 'a6000000-0000-4000-8000-0000000000d1',
             '96000000-0000-4000-8000-0000000000d1', 'other', 'Écriture directe', now(), 'Faux nom') $$,
  '42501', null,
  'un signalement ne s''écrit pas directement (le nom de l''auteur ne peut pas être falsifié)'
);

select set_config('request.jwt.claims', '{"sub": "46000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.submit_student_report(gen_random_uuid(), 'a6000000-0000-4000-8000-0000000000d1',
       '96000000-0000-4000-8000-0000000000d1', 'behavior', 'Bavardages répétés', now()) $$,
  'P0001', 'forbidden',
  'un enseignant d''une autre classe ne signale pas l''élève'
);

-- Le parent voit les signalements de son enfant, pas ceux des autres élèves.
select set_config('request.jwt.claims', '{"sub": "46000000-0000-4000-8000-0000000000d4", "role": "authenticated"}', true);

select results_eq(
  $$ select student_id, message from public.student_reports $$,
  $$ values ('a6000000-0000-4000-8000-0000000000d1'::uuid, 'Fièvre en milieu de matinée, l''infirmière a été prévenue.'::text) $$,
  'le parent ne voit que les signalements de son enfant'
);

select throws_ok(
  $$ select public.submit_student_report(gen_random_uuid(), 'a6000000-0000-4000-8000-0000000000d1',
       '96000000-0000-4000-8000-0000000000d1', 'other', 'Le parent ne signale pas', now()) $$,
  'P0001', 'forbidden',
  'le parent ne fait pas de signalement'
);

select * from finish();
rollback;
