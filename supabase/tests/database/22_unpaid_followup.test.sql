-- Impayés : relances réservées à la direction financière ; blocage facultatif du téléchargement des bulletins.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.schools (id, name, slug) values ('3f220000-0000-4000-8000-000000000010', 'École Test W', 'ecole-test-w');
insert into auth.users (id, aud, role, email) values
  ('4f220000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'comptable.w@test.local'),
  ('4f220000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.w@test.local'),
  ('4f220000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.w@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f220000-0000-4000-8000-000000000010', '4f220000-0000-4000-8000-000000000011', 'accountant'),
  ('3f220000-0000-4000-8000-000000000010', '4f220000-0000-4000-8000-000000000012', 'teacher'),
  ('3f220000-0000-4000-8000-000000000010', '4f220000-0000-4000-8000-000000000013', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f820000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on, locked_at) values
  ('5f830000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', '5f820000-0000-4000-8000-000000000011',
   1, '1er semestre', current_date - 60, current_date - 1, now());
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f220000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f220000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', '6f220000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f220000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', '5f820000-0000-4000-8000-000000000011', '7f220000-0000-4000-8000-000000000011', '6e A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0320000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', 'W-001', 'Awa', 'Ba', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f220000-0000-4000-8000-000000000010', 'b0320000-0000-4000-8000-000000000011', '9f220000-0000-4000-8000-000000000011', '5f820000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf220000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', 'Parent Ba', '4f220000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f220000-0000-4000-8000-000000000010', 'b0320000-0000-4000-8000-000000000011', 'cf220000-0000-4000-8000-000000000011', true);
insert into public.report_cards (id, school_id, class_id, period_id, student_id, data, published_at) values
  ('ac220000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', '9f220000-0000-4000-8000-000000000011',
   '5f830000-0000-4000-8000-000000000011', 'b0320000-0000-4000-8000-000000000011', '{"version": 1}', now());
-- Une mensualité échue et non payée.
insert into public.invoices (id, school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('e1200000-0000-4000-8000-000000000011', '3f220000-0000-4000-8000-000000000010', '5f820000-0000-4000-8000-000000000011',
   'b0320000-0000-4000-8000-000000000011', 'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', current_date - 10, 25000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f220000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is(
  public.report_card_download_blocked('ac220000-0000-4000-8000-000000000011'),
  false,
  'réglage désactivé (par défaut) : le parent télécharge le bulletin malgré l''impayé'
);

reset role;
update public.schools set settings = settings || '{"blockReportCardsWhenOverdue": true}' where id = '3f220000-0000-4000-8000-000000000010';
set local role authenticated;
select is(
  public.report_card_download_blocked('ac220000-0000-4000-8000-000000000011'),
  true,
  'réglage activé : téléchargement bloqué pour le parent d''un élève en retard de paiement'
);
select set_config('request.jwt.claims', '{"sub": "4f220000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is(
  public.report_card_download_blocked('ac220000-0000-4000-8000-000000000011'),
  false,
  'le personnel de l''école n''est jamais bloqué'
);

-- Une facture pas encore échue ne bloque pas ; une facture échue réglée non plus.
reset role;
update public.invoices set due_on = current_date + 5 where id = 'e1200000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f220000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is(
  public.report_card_download_blocked('ac220000-0000-4000-8000-000000000011'),
  false,
  'facture pas encore échue : pas de blocage'
);
reset role;
update public.invoices set due_on = current_date - 10, amount_paid = 25000 where id = 'e1200000-0000-4000-8000-000000000011';
set local role authenticated;
select is(
  public.report_card_download_blocked('ac220000-0000-4000-8000-000000000011'),
  false,
  'facture échue mais payée : pas de blocage'
);
reset role;
update public.invoices set amount_paid = 0 where id = 'e1200000-0000-4000-8000-000000000011';
set local role authenticated;

-- Relances.
select throws_ok(
  $$ insert into public.payment_reminders (school_id, student_id, channel, overdue_amount)
     values ('3f220000-0000-4000-8000-000000000010', 'b0320000-0000-4000-8000-000000000011', 'whatsapp', 25000) $$,
  '42501', null,
  'un parent ne note pas de relance'
);
select set_config('request.jwt.claims', '{"sub": "4f220000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.payment_reminders (school_id, student_id, channel, overdue_amount)
     values ('3f220000-0000-4000-8000-000000000010', 'b0320000-0000-4000-8000-000000000011', 'whatsapp', 25000) $$,
  'le comptable note une relance WhatsApp'
);
select results_eq(
  $$ select channel, overdue_amount, sent_by from public.payment_reminders $$,
  $$ values ('whatsapp'::text, 25000, '4f220000-0000-4000-8000-000000000011'::uuid) $$,
  'la relance garde son auteur et le montant en retard'
);
select throws_ok(
  $$ delete from public.payment_reminders $$,
  '42501', null,
  'une relance ne s''efface pas'
);
select set_config('request.jwt.claims', '{"sub": "4f220000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.payment_reminders $$, 'un enseignant ne voit pas les relances');

select * from finish();
rollback;
