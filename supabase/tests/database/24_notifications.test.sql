-- Notifications : écrites par la base au fil des événements, chacun ne voit et ne lit que les siennes.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into public.schools (id, name, slug) values ('3f240000-0000-4000-8000-000000000010', 'École Test Y', 'ecole-test-y');
insert into auth.users (id, aud, role, email) values
  ('4f240000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.y@test.local'),
  ('4f240000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'directeur.y@test.local'),
  ('4f240000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'comptable.y@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f240000-0000-4000-8000-000000000010', '4f240000-0000-4000-8000-000000000011', 'parent'),
  ('3f240000-0000-4000-8000-000000000010', '4f240000-0000-4000-8000-000000000012', 'director'),
  ('3f240000-0000-4000-8000-000000000010', '4f240000-0000-4000-8000-000000000013', 'accountant');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f860000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', '6f240000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', '5f860000-0000-4000-8000-000000000011', '7f240000-0000-4000-8000-000000000011', '6e A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0340000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', 'Y-001', 'Awa', 'Faye', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f240000-0000-4000-8000-000000000010', 'b0340000-0000-4000-8000-000000000011', '9f240000-0000-4000-8000-000000000011', '5f860000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', 'Parent Faye', '4f240000-0000-4000-8000-000000000011');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f240000-0000-4000-8000-000000000010', 'b0340000-0000-4000-8000-000000000011', 'cf240000-0000-4000-8000-000000000011', true);

-- Appel du matin : Awa absente, puis l'appel est corrigé (présente).
insert into public.attendance_sessions (id, school_id, class_id, date, slot, taken_at) values
  ('d0240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', '9f240000-0000-4000-8000-000000000011', current_date, 'morning', now());
insert into public.attendance_records (session_id, school_id, class_id, date, student_id, status) values
  ('d0240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', '9f240000-0000-4000-8000-000000000011',
   current_date, 'b0340000-0000-4000-8000-000000000011', 'absent');
select results_eq(
  $$ select user_id, kind, params ->> 'child', params ->> 'status', link from public.notifications $$,
  $$ values ('4f240000-0000-4000-8000-000000000011'::uuid, 'attendance'::text, 'Awa'::text, 'absent'::text,
             '/parent/enfants/b0340000-0000-4000-8000-000000000011'::text) $$,
  'absence à l''appel : le parent est prévenu'
);
update public.attendance_records set status = 'late' where student_id = 'b0340000-0000-4000-8000-000000000011';
select results_eq(
  $$ select count(*)::int, max(params ->> 'status') from public.notifications $$,
  $$ values (1, 'late'::text) $$,
  'appel corrigé en retard : la même notification est mise à jour, sans doublon'
);
update public.attendance_records set status = 'present' where student_id = 'b0340000-0000-4000-8000-000000000011';
select is_empty($$ select 1 from public.notifications $$, 'finalement présente : la notification disparaît');

-- Facture, paiement, demande d'annulation.
insert into public.invoices (id, school_id, academic_year_id, student_id, number, billing_month, label, due_on, total) values
  ('e1300000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', '5f860000-0000-4000-8000-000000000011',
   'b0340000-0000-4000-8000-000000000011', 'F2026-00001', '2026-10-01', 'Mensualité octobre 2026', current_date + 5, 25000);
select results_eq(
  $$ select kind, (params ->> 'total')::int from public.notifications $$,
  $$ values ('invoiceIssued'::text, 25000) $$,
  'facture émise : le parent est prévenu'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f240000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
create temporary table paid on commit drop as
  select public.record_payment('b0340000-0000-4000-8000-000000000011', 25000, 'cash') as id;
select is(
  (select count(*)::int from public.notifications),
  0,
  'le comptable ne voit pas les notifications des autres'
);
select lives_ok(
  $$ select public.request_payment_cancellation((select id from paid), 'Erreur de saisie') $$,
  'le comptable demande l''annulation du paiement'
);
reset role;
select results_eq(
  $$ select user_id, kind from public.notifications where kind <> 'invoiceIssued' order by kind $$,
  $$ values ('4f240000-0000-4000-8000-000000000012'::uuid, 'paymentCancelRequested'::text),
            ('4f240000-0000-4000-8000-000000000011'::uuid, 'paymentReceived'::text) $$,
  'paiement reçu chez le parent ; demande d''annulation chez le directeur (pas chez le comptable qui l''a faite)'
);

-- Signalement.
insert into public.student_reports (id, school_id, student_id, class_id, category, message, occurred_at, author_name) values
  ('a7240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', 'b0340000-0000-4000-8000-000000000011',
   '9f240000-0000-4000-8000-000000000011', 'health', 'Fièvre en classe', now(), 'Awa Diop');
select is(
  (select params ->> 'author' from public.notifications where kind = 'studentReport'),
  'Awa Diop',
  'signalement : le parent est prévenu, avec le nom de l''enseignante'
);

-- Le parent lit ses notifications.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f240000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is((select count(*)::int from public.notifications where read_at is null), 3, 'le parent a trois notifications non lues');
select lives_ok($$ update public.notifications set read_at = now() $$, 'il les marque comme lues');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'plus rien à lire');
select throws_ok(
  $$ update public.notifications set kind = 'autre' $$,
  '42501', null,
  'seule la date de lecture se modifie'
);
select throws_ok(
  $$ insert into public.notifications (user_id, school_id, kind, dedupe_key)
     values ('4f240000-0000-4000-8000-000000000011', '3f240000-0000-4000-8000-000000000010', 'fake', 'x') $$,
  '42501', null,
  'personne n''écrit de notification à la main'
);
select lives_ok(
  $$ insert into public.notification_settings (push, sms, whatsapp) values (true, false, true) $$,
  'le parent choisit ses canaux'
);

select * from finish();
rollback;
