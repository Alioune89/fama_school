-- Messagerie : parent ↔ professeur de la classe ou direction ; seuls les participants lisent ; cloche.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into public.schools (id, name, slug) values ('3f260000-0000-4000-8000-000000000010', 'École Test M', 'ecole-test-m');
insert into auth.users (id, aud, role, email) values
  ('4f260000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.m@test.local'),
  ('4f260000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.m@test.local'),
  ('4f260000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'autre-prof.m@test.local'),
  ('4f260000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'directeur.m@test.local'),
  ('4f260000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'autre-parent.m@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f260000-0000-4000-8000-000000000010', '4f260000-0000-4000-8000-000000000011', 'parent'),
  ('3f260000-0000-4000-8000-000000000010', '4f260000-0000-4000-8000-000000000012', 'teacher'),
  ('3f260000-0000-4000-8000-000000000010', '4f260000-0000-4000-8000-000000000013', 'teacher'),
  ('3f260000-0000-4000-8000-000000000010', '4f260000-0000-4000-8000-000000000014', 'director'),
  ('3f260000-0000-4000-8000-000000000010', '4f260000-0000-4000-8000-000000000015', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f880000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f260000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f260000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', '6f260000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.subjects (id, school_id, name) values
  ('8f260000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', 'Français');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('3f260000-0000-4000-8000-000000000010', '7f260000-0000-4000-8000-000000000011', '8f260000-0000-4000-8000-000000000011', 3);
insert into public.school_staff (id, school_id, full_name, phone, role, user_id) values
  ('af260000-0000-4000-8000-000000000012', '3f260000-0000-4000-8000-000000000010', 'Awa Diop', '+221770260012', 'teacher', '4f260000-0000-4000-8000-000000000012'),
  ('af260000-0000-4000-8000-000000000013', '3f260000-0000-4000-8000-000000000010', 'Ousmane Fall', '+221770260013', 'teacher', '4f260000-0000-4000-8000-000000000013');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f260000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', '5f880000-0000-4000-8000-000000000011', '7f260000-0000-4000-8000-000000000011', '6e A');
insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id) values
  ('3f260000-0000-4000-8000-000000000010', '9f260000-0000-4000-8000-000000000011', '8f260000-0000-4000-8000-000000000011', 'af260000-0000-4000-8000-000000000012');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0360000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', 'M-001', 'Awa', 'Ba', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f260000-0000-4000-8000-000000000010', 'b0360000-0000-4000-8000-000000000011', '9f260000-0000-4000-8000-000000000011', '5f880000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf260000-0000-4000-8000-000000000011', '3f260000-0000-4000-8000-000000000010', 'Khady Ba', '4f260000-0000-4000-8000-000000000011');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f260000-0000-4000-8000-000000000010', 'b0360000-0000-4000-8000-000000000011', 'cf260000-0000-4000-8000-000000000011', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f260000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select results_eq(
  $$ select c ->> 'name', c -> 'subjects' ->> 0
     from jsonb_array_elements(public.student_contacts('b0360000-0000-4000-8000-000000000011')) c $$,
  $$ values ('Awa Diop'::text, 'Français'::text) $$,
  'le parent voit les professeurs de la classe de son enfant'
);
select throws_ok(
  $$ select public.start_conversation('b0360000-0000-4000-8000-000000000011', '4f260000-0000-4000-8000-000000000011',
       '4f260000-0000-4000-8000-000000000013', 'Question', 'Bonjour') $$,
  'P0001', 'notTeacherOfStudent',
  'pas de conversation avec un professeur qui n''enseigne pas à l''enfant'
);
create temporary table conv on commit drop as
  select public.start_conversation('b0360000-0000-4000-8000-000000000011', '4f260000-0000-4000-8000-000000000011',
    '4f260000-0000-4000-8000-000000000012', 'Devoir de français', 'Bonjour, Awa était malade hier.') as id;
grant select on conv to authenticated;
create temporary table direction_conv on commit drop as
  select public.start_conversation('b0360000-0000-4000-8000-000000000011', '4f260000-0000-4000-8000-000000000011',
    null, 'Certificat de scolarité', 'Pouvez-vous m''en délivrer un ?') as id;
grant select on direction_conv to authenticated;
select is((select count(*)::int from public.conversations), 2, 'le parent ouvre une conversation avec le professeur et une avec la direction');

-- Le professeur reçoit la notification et lit la conversation qui le concerne seulement.
select set_config('request.jwt.claims', '{"sub": "4f260000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select results_eq(
  $$ select subject, teacher_name, parent_name from public.conversations $$,
  $$ values ('Devoir de français'::text, 'Awa Diop'::text, 'Khady Ba'::text) $$,
  'le professeur ne voit que sa conversation'
);
select results_eq(
  $$ select kind, link, params ->> 'from' from public.notifications $$,
  $$ values ('message'::text, '/professeur/messages/' || (select id from conv), 'Khady Ba'::text) $$,
  'il a été prévenu par la cloche'
);
select lives_ok(
  $$ select public.send_message((select id from conv), 'Merci, je lui donnerai le devoir demain.') $$,
  'il répond'
);
select lives_ok($$ select public.mark_conversation_read((select id from conv)) $$, 'il marque la conversation lue');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'sa notification est lue');

-- La direction : seule la conversation adressée à la direction.
select set_config('request.jwt.claims', '{"sub": "4f260000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select results_eq(
  $$ select subject from public.conversations $$,
  $$ values ('Certificat de scolarité'::text) $$,
  'la direction ne lit pas l''échange entre le parent et le professeur'
);
select is((select count(*)::int from public.messages), 1, 'ni ses messages');
select lives_ok(
  $$ select public.send_message((select id from direction_conv), 'Il sera prêt jeudi.') $$,
  'la direction répond'
);

-- Le parent : deux conversations, deux réponses ; les autres n'y ont pas accès.
select set_config('request.jwt.claims', '{"sub": "4f260000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select results_eq(
  $$ select count(*)::int from public.notifications where kind = 'message' and read_at is null $$,
  $$ values (2) $$,
  'le parent a deux réponses dans sa cloche'
);
select set_config('request.jwt.claims', '{"sub": "4f260000-0000-4000-8000-000000000015", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.messages $$, 'un autre parent ne lit rien');
select throws_ok(
  $$ select public.send_message((select id from conv), 'Intrus') $$,
  'P0001', 'forbidden',
  'ni n''écrit dans la conversation'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_name, body) values ((select id from conv), 'X', 'Y') $$,
  '42501', null,
  'un message ne s''écrit pas directement'
);

-- Horaires du professeur.
select set_config('request.jwt.claims', '{"sub": "4f260000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.staff_availability (days, starts_at, ends_at) values ('{1,2,3,4,5}', '08:00', '17:00') $$,
  'le professeur indique ses horaires'
);

select * from finish();
rollback;
