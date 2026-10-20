-- Demandes de démo : dépôt public, lecture réservée à l'équipe Fama School, garde-fou anti-abus.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, aud, role, email) values
  ('45000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'equipe@test.local'),
  ('45000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'directeur.c@test.local');
insert into public.platform_admins (user_id) values ('45000000-0000-4000-8000-0000000000c1');

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select lives_ok(
  $$ insert into public.demo_requests (full_name, school_name, role, phone, city, students_range)
     values ('Aminata Diallo', 'École Les Palmiers', 'director', '+221709994001', 'Thiès', '200to500') $$,
  'un visiteur dépose une demande'
);

select throws_ok(
  $$ insert into public.demo_requests (full_name, school_name, role, phone, status)
     values ('Intrus', 'École X', 'other', '+221709994002', 'closed') $$,
  '42501', null,
  'un visiteur ne choisit pas le statut'
);

select throws_ok(
  $$ select * from public.demo_requests $$,
  '42501', null,
  'un visiteur ne lit pas les demandes'
);

insert into public.demo_requests (full_name, school_name, role, phone) values ('Aminata Diallo', 'École Les Palmiers', 'director', '+221709994001');
insert into public.demo_requests (full_name, school_name, role, phone) values ('Aminata Diallo', 'École Les Palmiers', 'director', '+221709994001');
select throws_ok(
  $$ insert into public.demo_requests (full_name, school_name, role, phone) values ('Aminata Diallo', 'École Les Palmiers', 'director', '+221709994001') $$,
  'P0001', 'tooManyRequests',
  'au plus 3 demandes par numéro sur 24 heures'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "45000000-0000-4000-8000-0000000000c2", "role": "authenticated"}', true);
select is((select count(*)::int from public.demo_requests), 0, 'un utilisateur ordinaire ne voit aucune demande');

select set_config('request.jwt.claims', '{"sub": "45000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
select is((select count(*)::int from public.demo_requests where phone = '+221709994001'), 3, 'l''équipe Fama School voit les demandes');

select lives_ok(
  $$ update public.demo_requests set status = 'contacted', handled_by = '45000000-0000-4000-8000-0000000000c1' where phone = '+221709994001' $$,
  'l''équipe suit une demande'
);

select throws_ok(
  $$ update public.demo_requests set phone = '+221709994009' $$,
  '42501', null,
  'les coordonnées déposées ne sont pas modifiables'
);

select * from finish();
rollback;
