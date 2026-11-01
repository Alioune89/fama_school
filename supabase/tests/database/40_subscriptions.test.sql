-- Abonnements : paiements réservés à l'équipe Fama School, prolongation de la date de fin, date en lecture seule
-- pour l'école.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into public.schools (id, name, slug, subscription_ends_on) values
  ('3f400000-0000-4000-8000-000000000010', 'École Test S', 'ecole-test-s', '2027-06-30');
insert into auth.users (id, aud, role, email) values
  ('4f400000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'admin.s@test.local'),
  ('4f400000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'directeur.s@test.local');
insert into public.platform_admins (user_id) values ('4f400000-0000-4000-8000-000000000011');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f400000-0000-4000-8000-000000000010', '4f400000-0000-4000-8000-000000000012', 'director');

-- L'équipe Fama School enregistre un paiement qui couvre jusqu'à fin juillet : l'abonnement est prolongé.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"4f400000-0000-4000-8000-000000000011","role":"authenticated"}', true);
insert into public.subscription_payments (school_id, amount, method, paid_on, covers_until)
values ('3f400000-0000-4000-8000-000000000010', 120000, 'wave', '2027-06-25', '2027-07-31');
select is(
  (select subscription_ends_on from public.schools where id = '3f400000-0000-4000-8000-000000000010'),
  '2027-07-31'::date, 'un paiement prolonge l''abonnement jusqu''à la fin de la période couverte'
);

-- Un paiement plus ancien, saisi après coup, ne raccourcit pas l'abonnement.
insert into public.subscription_payments (school_id, amount, method, paid_on, covers_until)
values ('3f400000-0000-4000-8000-000000000010', 120000, 'cash', '2027-05-25', '2027-06-30');
select is(
  (select subscription_ends_on from public.schools where id = '3f400000-0000-4000-8000-000000000010'),
  '2027-07-31'::date, 'un paiement plus ancien ne raccourcit pas l''abonnement'
);
select is((select count(*)::int from public.subscription_payments), 2, 'l''équipe Fama School voit les paiements');

-- Le directeur voit la date de fin de son école, mais ni les paiements ni le droit de modifier la date.
select set_config('request.jwt.claims', '{"sub":"4f400000-0000-4000-8000-000000000012","role":"authenticated"}', true);
select is(
  (select subscription_ends_on from public.schools where id = '3f400000-0000-4000-8000-000000000010'),
  '2027-07-31'::date, 'le directeur lit la date de fin de son abonnement'
);
select is_empty($$ select 1 from public.subscription_payments $$, 'le directeur ne voit pas les paiements d''abonnement');
select throws_ok(
  $$ update public.schools set subscription_ends_on = '2030-01-01' where id = '3f400000-0000-4000-8000-000000000010' $$,
  '42501', null, 'le directeur ne peut pas prolonger lui-même son abonnement'
);

select * from finish();
rollback;
