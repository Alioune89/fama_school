-- Rapport journalier : écrit par le professeur pour le jour même, lu par lui et la direction pédagogique.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.schools (id, name, slug) values ('3f300000-0000-4000-8000-000000000010', 'École Test R', 'ecole-test-r');
insert into auth.users (id, aud, role, email) values
  ('4f300000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'prof.r@test.local'),
  ('4f300000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.r@test.local'),
  ('4f300000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'censeur.r@test.local'),
  ('4f300000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'parent.r@test.local');
insert into public.profiles (id, full_name) values ('4f300000-0000-4000-8000-000000000011', 'Fatou Ndiaye')
  on conflict (id) do update set full_name = excluded.full_name;
insert into public.school_memberships (school_id, user_id, role) values
  ('3f300000-0000-4000-8000-000000000010', '4f300000-0000-4000-8000-000000000011', 'teacher'),
  ('3f300000-0000-4000-8000-000000000010', '4f300000-0000-4000-8000-000000000012', 'teacher'),
  ('3f300000-0000-4000-8000-000000000010', '4f300000-0000-4000-8000-000000000013', 'censor'),
  ('3f300000-0000-4000-8000-000000000010', '4f300000-0000-4000-8000-000000000014', 'parent');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f300000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.daily_reports (school_id, body) values ('3f300000-0000-4000-8000-000000000010', 'Bonne journée, la 6e A a bien avancé.') $$,
  'le professeur écrit son rapport du jour'
);
select is((select author_name from public.daily_reports), 'Fatou Ndiaye', 'avec son nom');
select throws_ok(
  $$ insert into public.daily_reports (school_id, body, report_date) values ('3f300000-0000-4000-8000-000000000010', 'Rattrapage', current_date - 3) $$,
  '42501', null,
  'pas de rapport antidaté'
);

select set_config('request.jwt.claims', '{"sub": "4f300000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.daily_reports $$, 'un autre professeur ne lit pas ce rapport');

select set_config('request.jwt.claims', '{"sub": "4f300000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select results_eq(
  $$ select author_name, body from public.daily_reports $$,
  $$ values ('Fatou Ndiaye'::text, 'Bonne journée, la 6e A a bien avancé.'::text) $$,
  'le censeur le lit'
);

select set_config('request.jwt.claims', '{"sub": "4f300000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.daily_reports (school_id, body) values ('3f300000-0000-4000-8000-000000000010', 'Intrus') $$,
  '42501', null,
  'un parent n''écrit pas de rapport'
);
select throws_ok(
  $$ insert into public.daily_reports (school_id) values ('3f300000-0000-4000-8000-000000000010') $$,
  '42501', null,
  'ni un rapport vide'
);

select * from finish();
rollback;
