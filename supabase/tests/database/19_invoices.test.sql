-- Factures : émission mensuelle et annuelle idempotente, montants (options, réductions), numérotation sans trou,
-- annulation et réémission, droits.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

insert into public.schools (id, name, slug) values ('3f100000-0000-4000-8000-000000000010', 'École Test T', 'ecole-test-t');
insert into auth.users (id, aud, role, email) values
  ('4f100000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'comptable.t@test.local'),
  ('4f100000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.t@test.local'),
  ('4f100000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.t@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f100000-0000-4000-8000-000000000010', '4f100000-0000-4000-8000-000000000011', 'accountant'),
  ('3f100000-0000-4000-8000-000000000010', '4f100000-0000-4000-8000-000000000012', 'teacher'),
  ('3f100000-0000-4000-8000-000000000010', '4f100000-0000-4000-8000-000000000013', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f700000-0000-4000-8000-000000000011', '3f100000-0000-4000-8000-000000000010', '2026-2027', '2026-10-05', '2027-07-15', true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f100000-0000-4000-8000-000000000011', '3f100000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f400000-0000-4000-8000-000000000011', '3f100000-0000-4000-8000-000000000010', '6f100000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f000000-0000-4000-8000-000000000011', '3f100000-0000-4000-8000-000000000010', '5f700000-0000-4000-8000-000000000011', '7f400000-0000-4000-8000-000000000011', '6e A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0200000-0000-4000-8000-00000000000a', '3f100000-0000-4000-8000-000000000010', 'T-001', 'Awa', 'Diop', 'F'),
  ('b0200000-0000-4000-8000-00000000000b', '3f100000-0000-4000-8000-000000000010', 'T-002', 'Bineta', 'Fall', 'F'),
  ('b0200000-0000-4000-8000-00000000000c', '3f100000-0000-4000-8000-000000000010', 'T-003', 'Cheikh', 'Sy', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id)
  select '3f100000-0000-4000-8000-000000000010', id, '9f000000-0000-4000-8000-000000000011', '5f700000-0000-4000-8000-000000000011'
  from public.students where school_id = '3f100000-0000-4000-8000-000000000010';
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf100000-0000-4000-8000-000000000011', '3f100000-0000-4000-8000-000000000010', 'Parent Diop', '4f100000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f100000-0000-4000-8000-000000000010', 'b0200000-0000-4000-8000-00000000000a', 'cf100000-0000-4000-8000-000000000011', true);
insert into public.fee_types (id, school_id, name, kind, frequency, optional, position) values
  ('f2000000-0000-4000-8000-000000000001', '3f100000-0000-4000-8000-000000000010', 'Inscription', 'registration', 'once', false, 0),
  ('f2000000-0000-4000-8000-000000000002', '3f100000-0000-4000-8000-000000000010', 'Mensualité', 'tuition', 'monthly', false, 1),
  ('f2000000-0000-4000-8000-000000000003', '3f100000-0000-4000-8000-000000000010', 'Cantine', 'canteen', 'monthly', true, 2);
insert into public.fee_rates (school_id, academic_year_id, level_id, fee_type_id, amount)
  select '3f100000-0000-4000-8000-000000000010', '5f700000-0000-4000-8000-000000000011', '7f400000-0000-4000-8000-000000000011', id,
         case name when 'Inscription' then 30000 when 'Mensualité' then 25000 else 10000 end
  from public.fee_types where school_id = '3f100000-0000-4000-8000-000000000010';
-- Awa : cantine et réduction fratrie de 10 % ; Bineta : bourse complète sur les mensualités ; Cheikh : rien.
insert into public.student_fee_options (school_id, academic_year_id, student_id, fee_type_id) values
  ('3f100000-0000-4000-8000-000000000010', '5f700000-0000-4000-8000-000000000011', 'b0200000-0000-4000-8000-00000000000a', 'f2000000-0000-4000-8000-000000000003');
insert into public.student_discounts (school_id, academic_year_id, student_id, kind, percent) values
  ('3f100000-0000-4000-8000-000000000010', '5f700000-0000-4000-8000-000000000011', 'b0200000-0000-4000-8000-00000000000a', 'sibling', 10),
  ('3f100000-0000-4000-8000-000000000010', '5f700000-0000-4000-8000-000000000011', 'b0200000-0000-4000-8000-00000000000b', 'scholarship', 100);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f100000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

select is(
  public.issue_invoices('5f700000-0000-4000-8000-000000000011', '2026-10-01'),
  2,
  'le comptable émet les mensualités d''octobre : Awa et Cheikh (Bineta, boursière, ne doit rien)'
);
select is(
  public.issue_invoices('5f700000-0000-4000-8000-000000000011', '2026-10-01'),
  0,
  'relancer l''émission ne crée aucun doublon'
);
select results_eq(
  $$ select s.first_name, i.number, i.label, i.total, i.due_on from public.invoices i join public.students s on s.id = i.student_id
     order by i.number $$,
  $$ values ('Awa'::text, 'F2026-00001'::text, 'Mensualité octobre 2026'::text, 31500, greatest('2026-10-05'::date, current_date)),
            ('Cheikh', 'F2026-00002', 'Mensualité octobre 2026', 25000, greatest('2026-10-05'::date, current_date)) $$,
  'numéros continus, libellé, échéance le 5 (ou le jour de l''émission, si plus tard) ; Awa : (25 000 + 10 000) − 10 %'
);
select results_eq(
  $$ select l.label, l.base_amount, l.discount_percent, l.amount from public.invoice_lines l
     join public.invoices i on i.id = l.invoice_id where i.number = 'F2026-00001' order by l.position $$,
  $$ values ('Mensualité'::text, 25000, 10.00::numeric, 22500), ('Cantine', 10000, 10.00, 9000) $$,
  'le détail de la facture d''Awa'
);
select throws_ok(
  $$ select public.issue_invoices('5f700000-0000-4000-8000-000000000011', '2027-07-01') $$,
  'P0001', 'monthOutsideSchedule',
  'pas de mensualité hors du calendrier (9 mois d''octobre à juin)'
);
select is(
  public.issue_invoices('5f700000-0000-4000-8000-000000000011'),
  3,
  'les frais annuels (inscription) sont dus par les trois élèves, la bourse ne portant que sur les mensualités'
);
select results_eq(
  $$ select max(number), sum(total)::int from public.invoices where billing_month is null $$,
  $$ values ('F2026-00005'::text, 90000) $$,
  'la numérotation continue'
);
select throws_ok(
  $$ insert into public.invoices (school_id, academic_year_id, student_id, number, label, due_on, total)
     values ('3f100000-0000-4000-8000-000000000010', '5f700000-0000-4000-8000-000000000011', 'b0200000-0000-4000-8000-00000000000c',
             'X-1', 'Faux', current_date, 1) $$,
  '42501', null,
  'une facture ne s''écrit pas directement'
);

-- Annulation d'une facture impayée, puis réémission avec un nouveau numéro.
select lives_ok(
  $$ select public.cancel_invoice((select id from public.invoices where number = 'F2026-00002'), 'Erreur de classe') $$,
  'le comptable annule une facture impayée'
);
select throws_ok(
  $$ select public.cancel_invoice((select id from public.invoices where number = 'F2026-00002'), 'Encore') $$,
  'P0001', 'invoiceCancelled',
  'une facture annulée ne s''annule pas deux fois'
);
select is(
  public.issue_invoices('5f700000-0000-4000-8000-000000000011', '2026-10-01'),
  1,
  'la mensualité de Cheikh est réémise'
);
select is(
  (select number from public.invoices where cancelled_at is null and billing_month = '2026-10-01'
   and student_id = 'b0200000-0000-4000-8000-00000000000c'),
  'F2026-00006',
  'avec le numéro suivant ; l''annulée garde le sien (pas de trou)'
);

-- Un enseignant n'émet rien ; le parent ne voit que les factures de son enfant.
select set_config('request.jwt.claims', '{"sub": "4f100000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.issue_invoices('5f700000-0000-4000-8000-000000000011', '2026-11-01') $$,
  'P0001', 'forbidden',
  'un enseignant n''émet pas de factures'
);
select set_config('request.jwt.claims', '{"sub": "4f100000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select results_eq(
  $$ select number from public.invoices order by number $$,
  $$ values ('F2026-00001'::text), ('F2026-00003') $$,
  'le parent voit les deux factures d''Awa'
);
select results_eq(
  $$ select count(*)::int from public.invoice_lines $$,
  $$ values (3) $$,
  'et leurs lignes seulement'
);

select * from finish();
rollback;
