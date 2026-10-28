-- Annonces ciblées (destinataires figés, cloche) et calendrier de l'école.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into public.schools (id, name, slug) values ('3f250000-0000-4000-8000-000000000010', 'École Test Z', 'ecole-test-z');
insert into auth.users (id, aud, role, email) values
  ('4f250000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'directeur.z@test.local'),
  ('4f250000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'parent-a.z@test.local'),
  ('4f250000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent-b.z@test.local'),
  ('4f250000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'prof.z@test.local');
insert into public.profiles (id, full_name) values ('4f250000-0000-4000-8000-000000000011', 'Moussa Ndiaye')
  on conflict (id) do update set full_name = excluded.full_name;
insert into public.school_memberships (school_id, user_id, role) values
  ('3f250000-0000-4000-8000-000000000010', '4f250000-0000-4000-8000-000000000011', 'director'),
  ('3f250000-0000-4000-8000-000000000010', '4f250000-0000-4000-8000-000000000012', 'parent'),
  ('3f250000-0000-4000-8000-000000000010', '4f250000-0000-4000-8000-000000000013', 'parent'),
  ('3f250000-0000-4000-8000-000000000010', '4f250000-0000-4000-8000-000000000014', 'teacher');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f870000-0000-4000-8000-000000000011', '3f250000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f250000-0000-4000-8000-000000000011', '3f250000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f250000-0000-4000-8000-000000000011', '3f250000-0000-4000-8000-000000000010', '6f250000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f250000-0000-4000-8000-000000000011', '3f250000-0000-4000-8000-000000000010', '5f870000-0000-4000-8000-000000000011', '7f250000-0000-4000-8000-000000000011', '6e A'),
  ('9f250000-0000-4000-8000-000000000012', '3f250000-0000-4000-8000-000000000010', '5f870000-0000-4000-8000-000000000011', '7f250000-0000-4000-8000-000000000011', '6e B');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0350000-0000-4000-8000-000000000011', '3f250000-0000-4000-8000-000000000010', 'Z-001', 'Awa', 'Gaye', 'F'),
  ('b0350000-0000-4000-8000-000000000012', '3f250000-0000-4000-8000-000000000010', 'Z-002', 'Modou', 'Sy', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f250000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000011', '9f250000-0000-4000-8000-000000000011', '5f870000-0000-4000-8000-000000000011'),
  ('3f250000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000012', '9f250000-0000-4000-8000-000000000012', '5f870000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf250000-0000-4000-8000-000000000011', '3f250000-0000-4000-8000-000000000010', 'Parent Gaye', '4f250000-0000-4000-8000-000000000012'),
  ('cf250000-0000-4000-8000-000000000012', '3f250000-0000-4000-8000-000000000010', 'Parent Sy', '4f250000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f250000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000011', 'cf250000-0000-4000-8000-000000000011', true),
  ('3f250000-0000-4000-8000-000000000010', 'b0350000-0000-4000-8000-000000000012', 'cf250000-0000-4000-8000-000000000012', true);
-- Modou a une facture en retard.
insert into public.invoices (school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('3f250000-0000-4000-8000-000000000010', '5f870000-0000-4000-8000-000000000011', 'b0350000-0000-4000-8000-000000000012',
   'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', current_date - 10, 25000);
delete from public.notifications where school_id = '3f250000-0000-4000-8000-000000000010';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.publish_announcement('3f250000-0000-4000-8000-000000000010', 'Réunion', 'Texte', 'parents') $$,
  'P0001', 'forbidden',
  'un parent ne publie pas d''annonce'
);

select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is(
  (public.publish_announcement('3f250000-0000-4000-8000-000000000010', 'Réunion des parents', 'Samedi à 10 h.', 'parents') ->> 'recipients')::int,
  2,
  'annonce à tous les parents : deux destinataires'
);
select is(
  (public.publish_announcement('3f250000-0000-4000-8000-000000000010', 'Sortie de la 6e A', 'Lundi au musée.', 'classes',
     array['9f250000-0000-4000-8000-000000000011']::uuid[]) ->> 'recipients')::int,
  1,
  'annonce à la 6e A : les seuls parents de la classe'
);
select is(
  (public.publish_announcement('3f250000-0000-4000-8000-000000000010', 'Rappel des frais', 'Merci de régulariser.', 'overdue') ->> 'recipients')::int,
  1,
  'annonce aux parents en retard de paiement : le seul parent concerné'
);
select is(
  (public.publish_announcement('3f250000-0000-4000-8000-000000000010', 'Conseil des maîtres', 'Jeudi 16 h.', 'staff') ->> 'recipients')::int,
  2,
  'annonce au personnel : directeur et enseignant'
);
select throws_ok(
  $$ select public.publish_announcement('3f250000-0000-4000-8000-000000000010', 'Sortie', 'Texte', 'classes', '{}') $$,
  'P0001', 'noClass',
  'il faut choisir au moins une classe'
);
select is((select count(*)::int from public.announcements), 4, 'la direction voit toutes les annonces');

-- Ce que lit chacun.
select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select results_eq(
  $$ select title from public.announcements order by published_at, title $$,
  $$ values ('Réunion des parents'::text), ('Sortie de la 6e A') $$,
  'le parent de la 6e A, à jour de ses paiements, lit deux annonces'
);
select results_eq(
  $$ select kind, link from public.notifications order by created_at limit 1 $$,
  $$ values ('announcement'::text, '/parent/annonces'::text) $$,
  'et les a reçues dans sa cloche'
);
select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select results_eq(
  $$ select a.title, n.link from public.announcements a join public.notifications n on n.dedupe_key = 'announcement:' || a.id $$,
  $$ values ('Conseil des maîtres'::text, '/professeur/annonces'::text) $$,
  'l''enseignant lit l''annonce au personnel, avec un lien vers son espace'
);

-- Calendrier.
select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
insert into public.school_events (school_id, title, kind, starts_on, ends_on, staff_only) values
  ('3f250000-0000-4000-8000-000000000010', 'Vacances de Noël', 'holiday', current_date + 50, current_date + 60, false),
  ('3f250000-0000-4000-8000-000000000010', 'Conseil pédagogique', 'meeting', current_date + 5, current_date + 5, true);
select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select results_eq(
  $$ select title from public.school_events $$,
  $$ values ('Vacances de Noël'::text) $$,
  'le parent voit les vacances, pas la réunion du personnel'
);
select throws_ok(
  $$ insert into public.school_events (school_id, title, kind, starts_on, ends_on)
     values ('3f250000-0000-4000-8000-000000000010', 'Fête', 'event', current_date, current_date) $$,
  '42501', null,
  'un parent n''ajoute pas d''événement'
);
select set_config('request.jwt.claims', '{"sub": "4f250000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select is((select count(*)::int from public.school_events), 2, 'l''enseignant voit aussi les réunions du personnel');

select * from finish();
rollback;
