-- Pointage QR : arrivée et sortie préviennent le parent, une fois par jour, et pas pour un scan d'un autre jour.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into public.schools (id, name, slug) values ('3f390000-0000-4000-8000-000000000010', 'École Test P', 'ecole-test-p');
insert into auth.users (id, aud, role, email) values
  ('4f390000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.p@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f390000-0000-4000-8000-000000000010', '4f390000-0000-4000-8000-000000000011', 'parent');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0390000-0000-4000-8000-000000000011', '3f390000-0000-4000-8000-000000000010', 'P-001', 'Awa', 'Faye', 'F'),
  ('b0390000-0000-4000-8000-000000000012', '3f390000-0000-4000-8000-000000000010', 'P-002', 'Modou', 'Faye', 'M');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf390000-0000-4000-8000-000000000011', '3f390000-0000-4000-8000-000000000010', 'Parent Faye', '4f390000-0000-4000-8000-000000000011');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f390000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000011', 'cf390000-0000-4000-8000-000000000011', true),
  ('3f390000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000012', 'cf390000-0000-4000-8000-000000000011', false);

insert into public.student_arrivals (id, school_id, student_id, date, scanned_at) values
  ('a1390000-0000-4000-8000-000000000011', '3f390000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000011',
   (now() at time zone 'UTC')::date, now());
select results_eq(
  $$ select user_id, kind, params ->> 'child', link from public.notifications where school_id = '3f390000-0000-4000-8000-000000000010' $$,
  $$ values ('4f390000-0000-4000-8000-000000000011'::uuid, 'arrival'::text, 'Awa'::text,
             '/parent/enfants/b0390000-0000-4000-8000-000000000011'::text) $$,
  'arrivée pointée : le parent est prévenu'
);

-- Un scan plus ancien reçu ensuite (même jour) met l'heure à jour sans nouvel avis.
update public.student_arrivals set scanned_at = now() - interval '5 minutes' where id = 'a1390000-0000-4000-8000-000000000011';
select is((select count(*)::int from public.notifications where school_id = '3f390000-0000-4000-8000-000000000010'), 1, 'une seule notification d''arrivée par jour');

insert into public.student_departures (id, school_id, student_id, date, scanned_at) values
  ('a2390000-0000-4000-8000-000000000011', '3f390000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000011',
   (now() at time zone 'UTC')::date, now());
select is(
  (select count(*)::int from public.notifications where school_id = '3f390000-0000-4000-8000-000000000010' and kind = 'departure'),
  1, 'sortie pointée : le parent est prévenu'
);

-- Scan hors ligne d'hier, reçu aujourd'hui : enregistré, mais sans avis.
insert into public.student_arrivals (id, school_id, student_id, date, scanned_at) values
  ('a1390000-0000-4000-8000-000000000012', '3f390000-0000-4000-8000-000000000010', 'b0390000-0000-4000-8000-000000000012',
   (now() at time zone 'UTC')::date - 1, now() - interval '1 day');
select is_empty(
  $$ select 1 from public.notifications where params ->> 'child' = 'Modou' $$,
  'scan d''un autre jour reçu en retard : pas de notification trompeuse'
);

select * from finish();
rollback;
