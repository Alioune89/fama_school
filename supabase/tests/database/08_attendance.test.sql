-- Appel : droits, idempotence des opérations hors ligne, le plus récent l'emporte, lecture par les parents.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

insert into public.schools (id, name, slug) values ('35000000-0000-4000-8000-00000000000c', 'École Test I', 'ecole-test-i');
insert into auth.users (id, aud, role, email) values
  ('45000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'prof.i@test.local'),
  ('45000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'autre.prof.i@test.local'),
  ('45000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'surveillant.i@test.local'),
  ('45000000-0000-4000-8000-0000000000c4', 'authenticated', 'authenticated', 'parent.i@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('35000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-0000000000c1', 'teacher'),
  ('35000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-0000000000c2', 'teacher'),
  ('35000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-0000000000c3', 'supervisor'),
  ('35000000-0000-4000-8000-00000000000c', '45000000-0000-4000-8000-0000000000c4', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('55000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', '2026-2027', '2026-10-01', '2027-07-31', true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('65000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', 'moyen', 'Moyen', 'twenty', 3);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('75000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', '65000000-0000-4000-8000-0000000000c1', '6e', 'Sixième', 7);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('85000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', 'Prof Principal', 'prof.i@test.local', 'teacher', '45000000-0000-4000-8000-0000000000c1'),
  ('85000000-0000-4000-8000-0000000000c2', '35000000-0000-4000-8000-00000000000c', 'Autre Prof', 'autre.prof.i@test.local', 'teacher', '45000000-0000-4000-8000-0000000000c2');
insert into public.classes (id, school_id, academic_year_id, level_id, name, homeroom_staff_id) values
  ('95000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', '55000000-0000-4000-8000-0000000000c1', '75000000-0000-4000-8000-0000000000c1', '6e A', '85000000-0000-4000-8000-0000000000c1');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('a5000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', 'I-001', 'Awa', 'Fall', 'F'),
  ('a5000000-0000-4000-8000-0000000000c2', '35000000-0000-4000-8000-00000000000c', 'I-002', 'Modou', 'Seck', 'M'),
  ('a5000000-0000-4000-8000-0000000000c3', '35000000-0000-4000-8000-00000000000c', 'I-003', 'Pape', 'Kane', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id, status) values
  ('35000000-0000-4000-8000-00000000000c', 'a5000000-0000-4000-8000-0000000000c1', '95000000-0000-4000-8000-0000000000c1', '55000000-0000-4000-8000-0000000000c1', 'active'),
  ('35000000-0000-4000-8000-00000000000c', 'a5000000-0000-4000-8000-0000000000c2', '95000000-0000-4000-8000-0000000000c1', '55000000-0000-4000-8000-0000000000c1', 'active'),
  ('35000000-0000-4000-8000-00000000000c', 'a5000000-0000-4000-8000-0000000000c3', '95000000-0000-4000-8000-0000000000c1', '55000000-0000-4000-8000-0000000000c1', 'active');
update public.enrollments set status = 'left', left_on = current_date where student_id = 'a5000000-0000-4000-8000-0000000000c3';
insert into public.guardians (id, school_id, full_name, user_id) values
  ('c5000000-0000-4000-8000-0000000000c1', '35000000-0000-4000-8000-00000000000c', 'Parent Fall', '45000000-0000-4000-8000-0000000000c4');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('35000000-0000-4000-8000-00000000000c', 'a5000000-0000-4000-8000-0000000000c1', 'c5000000-0000-4000-8000-0000000000c1', true);

set local role authenticated;

-- Le professeur principal fait l'appel du matin à 8 h.
select set_config('request.jwt.claims', '{"sub": "45000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);

select is(
  public.submit_roll_call('d5000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-0000000000c1', current_date, 'morning',
    date_trunc('day', now()) + interval '8 hours',
    '{"a5000000-0000-4000-8000-0000000000c1": "absent", "a5000000-0000-4000-8000-0000000000c2": "present", "a5000000-0000-4000-8000-0000000000c3": "present"}'),
  'applied',
  'le professeur de la classe fait l''appel'
);

select results_eq(
  $$ select student_id, status::text from public.attendance_records order by student_id $$,
  $$ values ('a5000000-0000-4000-8000-0000000000c1'::uuid, 'absent'::text), ('a5000000-0000-4000-8000-0000000000c2'::uuid, 'present'::text) $$,
  'les élèves présents dans la classe sont enregistrés ; l''élève parti est ignoré'
);

select is(
  public.submit_roll_call('d5000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-0000000000c1', current_date, 'morning',
    date_trunc('day', now()) + interval '8 hours',
    '{"a5000000-0000-4000-8000-0000000000c1": "present"}'),
  'duplicate',
  'une opération renvoyée par le téléphone n''est appliquée qu''une fois'
);

select is(
  (select status::text from public.attendance_records where student_id = 'a5000000-0000-4000-8000-0000000000c1'),
  'absent',
  'le doublon ne modifie rien'
);

-- Correction à 8 h 20 : Awa est arrivée en retard.
select is(
  public.submit_roll_call('d5000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-0000000000c1', current_date, 'morning',
    date_trunc('day', now()) + interval '8 hours 20 minutes',
    '{"a5000000-0000-4000-8000-0000000000c1": "late", "a5000000-0000-4000-8000-0000000000c2": "present"}'),
  'applied',
  'une correction plus récente est appliquée'
);

-- Un appel de 8 h 10 resté sur un autre téléphone arrive après la correction.
select is(
  public.submit_roll_call('d5000000-0000-4000-8000-000000000003', '95000000-0000-4000-8000-0000000000c1', current_date, 'morning',
    date_trunc('day', now()) + interval '8 hours 10 minutes',
    '{"a5000000-0000-4000-8000-0000000000c1": "absent"}'),
  'stale',
  'un appel plus ancien arrivé en retard ne remplace pas la correction'
);

select results_eq(
  $$ select status::text, (select count(*)::int from public.attendance_sessions) from public.attendance_records
     where student_id = 'a5000000-0000-4000-8000-0000000000c1' $$,
  $$ values ('late'::text, 1) $$,
  'un seul appel pour la classe, le jour et le créneau, avec le statut le plus récent'
);

select results_eq(
  $$ select outcome, is_first, absent_count, late_count from public.attendance_submissions order by taken_at $$,
  $$ values ('applied'::text, true, 1, 0), ('stale'::text, false, 0, 1), ('applied'::text, false, 0, 1) $$,
  'le journal garde chaque envoi : premier appel, appel ancien ignoré, correction'
);

select results_eq(
  $$ select s.is_first, c.previous_status::text, c.new_status::text
     from public.attendance_changes c join public.attendance_submissions s on s.id = c.submission_id
     where c.student_id = 'a5000000-0000-4000-8000-0000000000c1' order by s.taken_at $$,
  $$ values (true, null::text, 'absent'::text), (false, 'absent'::text, 'late'::text) $$,
  'le journal dit quel élève a changé de statut, et comment'
);

select is(
  (select submitted_by from public.attendance_submissions where is_first),
  '45000000-0000-4000-8000-0000000000c1'::uuid,
  'le journal garde l''auteur de l''appel'
);

select throws_ok(
  $$ insert into public.attendance_submissions (id, school_id, class_id, date, slot, taken_at, outcome)
     values (gen_random_uuid(), '35000000-0000-4000-8000-00000000000c', '95000000-0000-4000-8000-0000000000c1', current_date, 'afternoon', now(), 'applied') $$,
  '42501', null,
  'le journal ne s''écrit pas directement depuis l''application'
);

select throws_ok(
  $$ select public.submit_roll_call(gen_random_uuid(), '95000000-0000-4000-8000-0000000000c1', current_date + 1, 'morning', now(), '{}') $$,
  'P0001', 'dateOutOfRange',
  'pas d''appel pour un jour futur'
);

select throws_ok(
  $$ select public.submit_roll_call(gen_random_uuid(), '95000000-0000-4000-8000-0000000000c1', current_date - 8, 'morning', now(), '{}') $$,
  'P0001', 'dateOutOfRange',
  'pas d''appel au-delà d''une semaine de rattrapage'
);

-- Un professeur qui n'enseigne pas dans la classe.
select set_config('request.jwt.claims', '{"sub": "45000000-0000-4000-8000-0000000000c2", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.submit_roll_call(gen_random_uuid(), '95000000-0000-4000-8000-0000000000c1', current_date, 'afternoon', now(), '{}') $$,
  'P0001', 'forbidden',
  'un professeur d''une autre classe ne fait pas l''appel'
);

select is_empty(
  $$ select 1 from public.attendance_records $$,
  'ni ne voit la présence de la classe'
);

-- Le surveillant général fait l'appel de l'après-midi.
select set_config('request.jwt.claims', '{"sub": "45000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);

select is(
  public.submit_roll_call('d5000000-0000-4000-8000-000000000004', '95000000-0000-4000-8000-0000000000c1', current_date, 'afternoon', now(),
    '{"a5000000-0000-4000-8000-0000000000c2": "absent"}'),
  'applied',
  'le surveillant général fait l''appel de n''importe quelle classe'
);

select results_eq(
  $$ select last_name, absences, lates from public.attendance_absence_summary('35000000-0000-4000-8000-00000000000c', current_date - 30, current_date)
     order by last_name $$,
  $$ values ('Fall'::text, 0, 1), ('Seck'::text, 1, 0) $$,
  'le bilan compte les demi-journées d''absence et les retards de chaque élève'
);

-- Le parent voit la présence de son enfant, pas celle des autres.
select set_config('request.jwt.claims', '{"sub": "45000000-0000-4000-8000-0000000000c4", "role": "authenticated"}', true);

select results_eq(
  $$ select student_id, status::text from public.attendance_records $$,
  $$ values ('a5000000-0000-4000-8000-0000000000c1'::uuid, 'late'::text) $$,
  'le parent ne voit que la présence de son enfant'
);

select throws_ok(
  $$ select public.submit_roll_call(gen_random_uuid(), '95000000-0000-4000-8000-0000000000c1', current_date, 'morning', now(), '{}') $$,
  'P0001', 'forbidden',
  'le parent ne fait pas l''appel'
);

select results_eq(
  $$ select slot::text from public.attendance_sessions order by slot $$,
  $$ values ('morning'::text) $$,
  'le parent voit le créneau de l''appel où figure son enfant, pas les autres appels'
);

select results_eq(
  $$ select last_name from public.attendance_absence_summary('35000000-0000-4000-8000-00000000000c', current_date - 30, current_date) $$,
  $$ values ('Fall'::text) $$,
  'le bilan d''un parent ne contient que son enfant'
);

select * from finish();
rollback;
