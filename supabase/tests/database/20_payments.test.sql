-- Guichet : encaissement réparti sur les factures, reçus numérotés, annulation en deux temps, vérification, dépenses.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into public.schools (id, name, slug) values ('3f200000-0000-4000-8000-000000000010', 'École Test U', 'ecole-test-u');
insert into auth.users (id, aud, role, email) values
  ('4f200000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'comptable.u@test.local'),
  ('4f200000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'directeur.u@test.local'),
  ('4f200000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'prof.u@test.local'),
  ('4f200000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'parent.u@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f200000-0000-4000-8000-000000000010', '4f200000-0000-4000-8000-000000000011', 'accountant'),
  ('3f200000-0000-4000-8000-000000000010', '4f200000-0000-4000-8000-000000000012', 'director'),
  ('3f200000-0000-4000-8000-000000000010', '4f200000-0000-4000-8000-000000000013', 'teacher'),
  ('3f200000-0000-4000-8000-000000000010', '4f200000-0000-4000-8000-000000000014', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f800000-0000-4000-8000-000000000011', '3f200000-0000-4000-8000-000000000010', '2026-2027', '2026-10-05', '2027-07-15', true);
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0300000-0000-4000-8000-000000000011', '3f200000-0000-4000-8000-000000000010', 'U-001', 'Awa', 'Diop', 'F');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf200000-0000-4000-8000-000000000011', '3f200000-0000-4000-8000-000000000010', 'Parent Diop', '4f200000-0000-4000-8000-000000000014');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f200000-0000-4000-8000-000000000010', 'b0300000-0000-4000-8000-000000000011', 'cf200000-0000-4000-8000-000000000011', true);
insert into public.invoices (id, school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('e1000000-0000-4000-8000-000000000011', '3f200000-0000-4000-8000-000000000010', '5f800000-0000-4000-8000-000000000011',
   'b0300000-0000-4000-8000-000000000011', 'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', '2026-10-05', 25000),
  ('e1000000-0000-4000-8000-000000000012', '3f200000-0000-4000-8000-000000000010', '5f800000-0000-4000-8000-000000000011',
   'b0300000-0000-4000-8000-000000000011', 'F2026-00002', '2026-11-01', 'Mensualité novembre 2026', '2026-11-05', 25000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f200000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

create temporary table first_payment on commit drop as
  select public.record_payment('b0300000-0000-4000-8000-000000000011', 30000, 'cash') as id;
select results_eq(
  $$ select number ~ ('^R' || extract(year from current_date) || '-00001$'), amount, method::text, status::text
     from public.payments where id = (select id from first_payment) $$,
  $$ values (true, 30000, 'cash'::text, 'valid'::text) $$,
  'le comptable encaisse 30 000 FCFA en espèces : reçu n° 1'
);
select results_eq(
  $$ select number, amount_paid from public.invoices order by number $$,
  $$ values ('F2026-00001'::text, 25000), ('F2026-00002', 5000) $$,
  'réparti de la plus ancienne échéance à la plus récente : octobre soldé, novembre entamé'
);
select throws_ok(
  $$ select public.record_payment('b0300000-0000-4000-8000-000000000011', 25000, 'cash') $$,
  'P0001', 'amountExceedsDue',
  'pas plus que le reste dû (20 000 FCFA)'
);
create temporary table second_payment on commit drop as
  select public.record_payment('b0300000-0000-4000-8000-000000000011', 20000, 'wave', ' TX-123 ') as id;
select results_eq(
  $$ select number ~ '-00002$', reference from public.payments where id = (select id from second_payment) $$,
  $$ values (true, 'TX-123'::text) $$,
  'paiement Wave avec sa référence : reçu n° 2'
);
select throws_ok(
  $$ select public.record_payment('b0300000-0000-4000-8000-000000000011', 1000, 'cash') $$,
  'P0001', 'nothingDue',
  'plus rien à payer'
);
select throws_ok(
  $$ insert into public.payments (school_id, student_id, number, method, amount)
     values ('3f200000-0000-4000-8000-000000000010', 'b0300000-0000-4000-8000-000000000011', 'X', 'cash', 1) $$,
  '42501', null,
  'un paiement ne s''écrit pas directement'
);

-- Annulation en deux temps.
select lives_ok(
  $$ select public.request_payment_cancellation((select id from second_payment), 'Erreur de saisie') $$,
  'le comptable demande l''annulation du paiement Wave'
);
select is(
  (select amount_paid from public.invoices where number = 'F2026-00002'),
  25000,
  'en attente de décision, le paiement compte toujours'
);
select throws_ok(
  $$ select public.decide_payment_cancellation((select id from second_payment), true) $$,
  'P0001', 'forbidden',
  'le comptable ne valide pas sa propre demande'
);
select set_config('request.jwt.claims', '{"sub": "4f200000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.decide_payment_cancellation((select id from second_payment), true) $$,
  'le directeur valide l''annulation'
);
select results_eq(
  $$ select (select status::text from public.payments where id = (select id from second_payment)),
            (select amount_paid from public.invoices where number = 'F2026-00002') $$,
  $$ values ('cancelled'::text, 5000) $$,
  'le paiement est annulé et ne compte plus : novembre redevient dû'
);
select throws_ok(
  $$ select public.request_payment_cancellation((select id from second_payment), 'Encore') $$,
  'P0001', 'paymentNotValid',
  'un paiement annulé ne s''annule plus'
);
select lives_ok(
  $$ select public.request_payment_cancellation((select id from first_payment), 'Doublon') $$,
  'le directeur demande lui-même une annulation…'
);
select throws_ok(
  $$ select public.decide_payment_cancellation((select id from first_payment), true) $$,
  'P0001', 'sameValidator',
  '… mais une autre personne de la direction doit la valider'
);

-- Un enseignant n'encaisse pas ; le parent voit les reçus de son enfant.
select set_config('request.jwt.claims', '{"sub": "4f200000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.record_payment('b0300000-0000-4000-8000-000000000011', 1000, 'cash') $$,
  'P0001', 'forbidden',
  'un enseignant n''encaisse pas'
);
select set_config('request.jwt.claims', '{"sub": "4f200000-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select results_eq(
  $$ select count(*)::int from public.payments $$,
  $$ values (2) $$,
  'le parent voit les reçus de son enfant'
);

-- Vérification publique d'un reçu.
create temporary table receipt_code on commit drop as
  select code from public.payments where id = (select id from first_payment);
grant select on receipt_code to anon;
set local role anon;
select results_eq(
  $$ select r ->> 'kind', (r ->> 'amount')::int, r #>> '{student,lastName}'
     from (select public.verify_report_card((select code from receipt_code), '198.51.100.40') r) v $$,
  $$ values ('receipt'::text, 30000, 'Diop'::text) $$,
  'un reçu se vérifie sur /verifier, comme un bulletin'
);

-- Dépenses : réservées à la direction financière.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f200000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
insert into public.expenses (school_id, category, label, amount) values ('3f200000-0000-4000-8000-000000000010', 'utilities', 'Facture Senelec', 85000);
select set_config('request.jwt.claims', '{"sub": "4f200000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.expenses $$, 'un enseignant ne voit pas les dépenses');

select * from finish();
rollback;
