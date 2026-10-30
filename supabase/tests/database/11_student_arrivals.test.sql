-- Pointage des arrivées : jeton des cartes, droits, idempotence, premier passage, visibilité des parents.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into public.schools (id, name, slug) values ('38000000-0000-4000-8000-00000000000f', 'École Test L', 'ecole-test-l');
insert into auth.users (id, aud, role, email) values
  ('48000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'surveillant.l@test.local'),
  ('48000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'prof.l@test.local'),
  ('48000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'directeur.l@test.local'),
  ('48000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'parent.l@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('38000000-0000-4000-8000-00000000000f', '48000000-0000-4000-8000-0000000000f1', 'supervisor'),
  ('38000000-0000-4000-8000-00000000000f', '48000000-0000-4000-8000-0000000000f2', 'teacher'),
  ('38000000-0000-4000-8000-00000000000f', '48000000-0000-4000-8000-0000000000f3', 'director'),
  ('38000000-0000-4000-8000-00000000000f', '48000000-0000-4000-8000-0000000000f4', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('58000000-0000-4000-8000-0000000000f1', '38000000-0000-4000-8000-00000000000f', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('68000000-0000-4000-8000-0000000000f1', '38000000-0000-4000-8000-00000000000f', 'elementaire', 'Élémentaire', 'ten', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('78000000-0000-4000-8000-0000000000f1', '38000000-0000-4000-8000-00000000000f', '68000000-0000-4000-8000-0000000000f1', 'CE2', 'Cours élémentaire 2', 4);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('98000000-0000-4000-8000-0000000000f1', '38000000-0000-4000-8000-00000000000f', '58000000-0000-4000-8000-0000000000f1', '78000000-0000-4000-8000-0000000000f1', 'CE2 A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('a8000000-0000-4000-8000-0000000000f1', '38000000-0000-4000-8000-00000000000f', 'L-001', 'Coumba', 'Sarr', 'F'),
  ('a8000000-0000-4000-8000-0000000000f2', '38000000-0000-4000-8000-00000000000f', 'L-002', 'Lamine', 'Faye', 'M'),
  ('a8000000-0000-4000-8000-0000000000f3', '38000000-0000-4000-8000-00000000000f', 'L-003', 'Sans', 'Classe', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('38000000-0000-4000-8000-00000000000f', 'a8000000-0000-4000-8000-0000000000f1', '98000000-0000-4000-8000-0000000000f1', '58000000-0000-4000-8000-0000000000f1'),
  ('38000000-0000-4000-8000-00000000000f', 'a8000000-0000-4000-8000-0000000000f2', '98000000-0000-4000-8000-0000000000f1', '58000000-0000-4000-8000-0000000000f1');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('c8000000-0000-4000-8000-0000000000f1', '38000000-0000-4000-8000-00000000000f', 'Parent Sarr', '48000000-0000-4000-8000-0000000000f4');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('38000000-0000-4000-8000-00000000000f', 'a8000000-0000-4000-8000-0000000000f1', 'c8000000-0000-4000-8000-0000000000f1', true);

select ok(
  (select count(distinct badge_token) = 3 and bool_and(badge_token ~ '^[0-9a-f]{32}$') from public.students
   where school_id = '38000000-0000-4000-8000-00000000000f'),
  'chaque élève reçoit un jeton de carte aléatoire et unique'
);

-- Heure d'aujourd'hui déjà passée, en fraction du temps écoulé depuis minuit : le test passe à toute heure
-- (juste après minuit, « 8 h » ou « il y a 20 minutes » seraient dans le futur ou la veille).
create function pg_temp.today_at(p_fraction numeric) returns timestamptz language sql stable as $f$
  select date_trunc('day', now()) + (now() - date_trunc('day', now())) * p_fraction
$f$;
grant execute on function pg_temp.today_at(numeric) to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "48000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);

select is(
  public.record_arrival('e8000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-0000000000f1', pg_temp.today_at(0.5)),
  'applied',
  'le surveillant pointe l''arrivée de Coumba'
);
select is(
  public.record_arrival('e8000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-0000000000f1', pg_temp.today_at(0.5)),
  'duplicate',
  'un scan renvoyé par le téléphone n''est compté qu''une fois'
);
select is(
  public.record_arrival('e8000000-0000-4000-8000-000000000002', 'a8000000-0000-4000-8000-0000000000f1', pg_temp.today_at(0.8)),
  'stale',
  'un second passage plus tard ne change pas l''heure d''arrivée'
);
select is(
  public.record_arrival('e8000000-0000-4000-8000-000000000003', 'a8000000-0000-4000-8000-0000000000f1', pg_temp.today_at(0.4)),
  'applied',
  'un scan plus ancien reçu en retard (téléphone hors ligne) avance l''heure d''arrivée'
);
select results_eq(
  $$ select count(*)::int, bool_and(scanned_at = pg_temp.today_at(0.4)), bool_and(date = current_date)
     from public.student_arrivals $$,
  $$ values (1, true, true) $$,
  'une seule arrivée par jour, à l''heure du premier passage'
);
select is(
  public.record_arrival(gen_random_uuid(), 'a8000000-0000-4000-8000-0000000000f2', now() + interval '1 hour'),
  'applied',
  'une heure future du téléphone est ramenée à l''heure de réception'
);
select throws_ok(
  $$ select public.record_arrival(gen_random_uuid(), 'a8000000-0000-4000-8000-0000000000f3', now()) $$,
  'P0001', 'unknownStudent',
  'un élève sans inscription cette année n''est pas pointé'
);
select throws_ok(
  $$ select public.record_arrival(gen_random_uuid(), 'a8000000-0000-4000-8000-0000000000f2', now() - interval '8 days') $$,
  'P0001', 'dateOutOfRange',
  'pas de pointage au-delà de 7 jours'
);
select throws_ok(
  $$ insert into public.student_arrivals (id, school_id, student_id, date, scanned_at)
     values (gen_random_uuid(), '38000000-0000-4000-8000-00000000000f', 'a8000000-0000-4000-8000-0000000000f2', current_date, now()) $$,
  '42501', null,
  'une arrivée ne s''écrit pas directement'
);

-- Sorties : mêmes règles que les arrivées.
select is(
  public.record_departure('e8000000-0000-4000-8000-000000000011', 'a8000000-0000-4000-8000-0000000000f1', pg_temp.today_at(0.9)),
  'applied',
  'le surveillant pointe la sortie de Coumba'
);
select is(
  public.record_departure('e8000000-0000-4000-8000-000000000011', 'a8000000-0000-4000-8000-0000000000f1', pg_temp.today_at(0.9)),
  'duplicate',
  'une sortie renvoyée par le téléphone n''est comptée qu''une fois'
);
select is(
  public.record_departure('e8000000-0000-4000-8000-000000000012', 'a8000000-0000-4000-8000-0000000000f1', now()),
  'stale',
  'un second passage à la sortie ne change pas l''heure'
);

-- Un enseignant ne pointe pas et ne renouvelle pas les cartes.
select set_config('request.jwt.claims', '{"sub": "48000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.record_arrival(gen_random_uuid(), 'a8000000-0000-4000-8000-0000000000f2', now()) $$,
  'P0001', 'forbidden',
  'un enseignant ne pointe pas les arrivées'
);
select throws_ok(
  $$ select public.record_departure(gen_random_uuid(), 'a8000000-0000-4000-8000-0000000000f2', now()) $$,
  'P0001', 'forbidden',
  'ni les sorties'
);

-- Le parent voit l'arrivée de son enfant, pas celle des autres.
select set_config('request.jwt.claims', '{"sub": "48000000-0000-4000-8000-0000000000f4", "role": "authenticated"}', true);
select results_eq(
  $$ select student_id from public.student_arrivals union all select student_id from public.student_departures $$,
  $$ values ('a8000000-0000-4000-8000-0000000000f1'::uuid), ('a8000000-0000-4000-8000-0000000000f1'::uuid) $$,
  'le parent ne voit que l''arrivée et la sortie de son enfant'
);

-- Carte perdue : le directeur la renouvelle.
select set_config('request.jwt.claims', '{"sub": "48000000-0000-4000-8000-0000000000f3", "role": "authenticated"}', true);
create temporary table old_token on commit drop as
  select badge_token from public.students where id = 'a8000000-0000-4000-8000-0000000000f1';
select lives_ok(
  $$ select public.renew_student_badge('a8000000-0000-4000-8000-0000000000f1') $$,
  'le directeur renouvelle la carte d''un élève'
);
select isnt(
  (select badge_token from public.students where id = 'a8000000-0000-4000-8000-0000000000f1'),
  (select badge_token from old_token),
  'l''ancienne carte ne fonctionne plus'
);

select * from finish();
rollback;
