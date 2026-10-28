-- Paiement en ligne : lancé par le parent, réglé par le serveur seulement, encaissé une seule fois.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into public.schools (id, name, slug) values ('3f210000-0000-4000-8000-000000000010', 'École Test V', 'ecole-test-v');
insert into auth.users (id, aud, role, email) values
  ('4f210000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.v@test.local'),
  ('4f210000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.parent.v@test.local'),
  ('4f210000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'comptable.v@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f210000-0000-4000-8000-000000000010', '4f210000-0000-4000-8000-000000000011', 'parent'),
  ('3f210000-0000-4000-8000-000000000010', '4f210000-0000-4000-8000-000000000012', 'parent'),
  ('3f210000-0000-4000-8000-000000000010', '4f210000-0000-4000-8000-000000000013', 'accountant');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f810000-0000-4000-8000-000000000011', '3f210000-0000-4000-8000-000000000010', '2026-2027', '2026-10-05', '2027-07-15', true);
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0310000-0000-4000-8000-000000000011', '3f210000-0000-4000-8000-000000000010', 'V-001', 'Awa', 'Ndiaye', 'F');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf210000-0000-4000-8000-000000000011', '3f210000-0000-4000-8000-000000000010', 'Parent Ndiaye', '4f210000-0000-4000-8000-000000000011');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f210000-0000-4000-8000-000000000010', 'b0310000-0000-4000-8000-000000000011', 'cf210000-0000-4000-8000-000000000011', true);
insert into public.invoices (id, school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('e1100000-0000-4000-8000-000000000011', '3f210000-0000-4000-8000-000000000010', '5f810000-0000-4000-8000-000000000011',
   'b0310000-0000-4000-8000-000000000011', 'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', '2026-10-05', 25000),
  ('e1100000-0000-4000-8000-000000000012', '3f210000-0000-4000-8000-000000000010', '5f810000-0000-4000-8000-000000000011',
   'b0310000-0000-4000-8000-000000000011', 'F2026-00002', '2026-11-01', 'Mensualité novembre 2026', '2026-11-05', 25000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f210000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.start_online_payment('b0310000-0000-4000-8000-000000000011', array['e1100000-0000-4000-8000-000000000011']::uuid[], 'simulated') $$,
  'P0001', 'forbidden',
  'un parent ne paie pas pour l''enfant d''un autre'
);

select set_config('request.jwt.claims', '{"sub": "4f210000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
create temporary table first_try on commit drop as
  select public.start_online_payment(
    'b0310000-0000-4000-8000-000000000011',
    array['e1100000-0000-4000-8000-000000000011', 'e1100000-0000-4000-8000-000000000012']::uuid[],
    'simulated'
  ) as r;
grant select on first_try to service_role;
select results_eq(
  $$ select (r ->> 'amount')::int, r ->> 'studentName' from first_try $$,
  $$ values (50000, 'Awa Ndiaye'::text) $$,
  'le parent lance le paiement des deux mensualités : 50 000 FCFA'
);
select throws_ok(
  $$ select public.start_online_payment('b0310000-0000-4000-8000-000000000011', array[]::uuid[], 'simulated') $$,
  'P0001', 'nothingDue',
  'il faut au moins une facture due'
);
select throws_ok(
  $$ select public.settle_online_payment((select (r ->> 'id')::uuid from first_try), 'succeeded') $$,
  '42501', null,
  'le parent ne peut pas déclarer lui-même le paiement réussi'
);
select throws_ok(
  $$ update public.online_payments set status = 'succeeded' $$,
  '42501', null,
  'un paiement en ligne ne se modifie pas directement'
);
select results_eq(
  $$ select status::text from public.online_payments $$,
  $$ values ('pending'::text) $$,
  'le parent voit son paiement en attente'
);

-- Le serveur, après confirmation du fournisseur.
set local role service_role;
select lives_ok(
  $$ select public.set_online_payment_checkout((select (r ->> 'id')::uuid from first_try), 'tok-1', 'https://pay.test/tok-1') $$,
  'le serveur enregistre la page de paiement ouverte chez le fournisseur'
);
create temporary table settled on commit drop as
  select public.settle_online_payment((select (r ->> 'id')::uuid from first_try), 'succeeded', 'PD-42') as payment_id;
select results_eq(
  $$ select p.method::text, p.amount, p.reference, p.received_by
     from public.payments p where p.id = (select payment_id from settled) $$,
  $$ values ('online'::text, 50000, 'PD-42'::text, '4f210000-0000-4000-8000-000000000011'::uuid) $$,
  'paiement réussi : encaissement « en ligne » de 50 000 FCFA, avec la référence du fournisseur'
);
select results_eq(
  $$ select number, amount_paid from public.invoices where school_id = '3f210000-0000-4000-8000-000000000010' order by number $$,
  $$ values ('F2026-00001'::text, 25000), ('F2026-00002', 25000) $$,
  'les deux factures sont soldées'
);
select is(
  public.settle_online_payment((select (r ->> 'id')::uuid from first_try), 'succeeded', 'PD-42'),
  (select payment_id from settled),
  'une seconde notification ne crée pas un second encaissement'
);
select is((select count(*)::int from public.payments where school_id = '3f210000-0000-4000-8000-000000000010'), 1, 'un seul reçu');
select is(
  (select status::text from public.online_payments where id = (select (r ->> 'id')::uuid from first_try)),
  'succeeded',
  'le paiement en ligne est noté réussi'
);

-- Le comptable voit les paiements en ligne de l'école ; le guichet garde sa limite au reste dû.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f210000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is((select count(*)::int from public.online_payments), 1, 'le comptable voit les paiements en ligne');
select throws_ok(
  $$ select public.record_payment('b0310000-0000-4000-8000-000000000011', 1000, 'cash') $$,
  'P0001', 'nothingDue',
  'plus rien à encaisser au guichet'
);

select * from finish();
rollback;
