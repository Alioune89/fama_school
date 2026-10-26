-- Grille des frais : qui écrit (fondateur, directeur, comptable), qui lit, options et réductions d'un élève.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.schools (id, name, slug) values ('3f000000-0000-4000-8000-000000000010', 'École Test S', 'ecole-test-s');
insert into auth.users (id, aud, role, email) values
  ('4f000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'comptable.s@test.local'),
  ('4f000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'censeur.s@test.local'),
  ('4f000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.s@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f000000-0000-4000-8000-000000000010', '4f000000-0000-4000-8000-000000000011', 'accountant'),
  ('3f000000-0000-4000-8000-000000000010', '4f000000-0000-4000-8000-000000000012', 'censor'),
  ('3f000000-0000-4000-8000-000000000010', '4f000000-0000-4000-8000-000000000013', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f600000-0000-4000-8000-000000000011', '3f000000-0000-4000-8000-000000000010', '2026-2027', '2026-10-05', '2027-07-15', true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f000000-0000-4000-8000-000000000011', '3f000000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f300000-0000-4000-8000-000000000011', '3f000000-0000-4000-8000-000000000010', '6f000000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0100000-0000-4000-8000-000000000011', '3f000000-0000-4000-8000-000000000010', 'S-001', 'Awa', 'Diop', 'F'),
  ('b0100000-0000-4000-8000-000000000012', '3f000000-0000-4000-8000-000000000010', 'S-002', 'Modou', 'Fall', 'M');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf000000-0000-4000-8000-000000000011', '3f000000-0000-4000-8000-000000000010', 'Parent Diop', '4f000000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f000000-0000-4000-8000-000000000010', 'b0100000-0000-4000-8000-000000000011', 'cf000000-0000-4000-8000-000000000011', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.fee_types (id, school_id, name, kind, frequency, optional) values
       ('f1000000-0000-4000-8000-000000000001', '3f000000-0000-4000-8000-000000000010', 'Mensualité', 'tuition', 'monthly', false),
       ('f1000000-0000-4000-8000-000000000002', '3f000000-0000-4000-8000-000000000010', 'Cantine', 'canteen', 'monthly', true) $$,
  'le comptable crée les types de frais'
);
select lives_ok(
  $$ insert into public.fee_rates (school_id, academic_year_id, level_id, fee_type_id, amount) values
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', '7f300000-0000-4000-8000-000000000011',
        'f1000000-0000-4000-8000-000000000001', 25000) $$,
  'et les montants par niveau'
);
select throws_ok(
  $$ insert into public.fee_rates (school_id, academic_year_id, level_id, fee_type_id, amount) values
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', '7f300000-0000-4000-8000-000000000011',
        'f1000000-0000-4000-8000-000000000002', -5) $$,
  '23514', null,
  'pas de montant négatif'
);
select throws_ok(
  $$ insert into public.student_fee_options (school_id, academic_year_id, student_id, fee_type_id) values
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', 'b0100000-0000-4000-8000-000000000011',
        'f1000000-0000-4000-8000-000000000001') $$,
  'P0001', 'feeNotOptional',
  'la mensualité n''est pas une option'
);
select lives_ok(
  $$ insert into public.student_fee_options (school_id, academic_year_id, student_id, fee_type_id) values
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', 'b0100000-0000-4000-8000-000000000011',
        'f1000000-0000-4000-8000-000000000002');
     insert into public.student_discounts (school_id, academic_year_id, student_id, kind, percent) values
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', 'b0100000-0000-4000-8000-000000000011', 'sibling', 10),
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', 'b0100000-0000-4000-8000-000000000012', 'scholarship', 50) $$,
  'Awa prend la cantine et a une réduction fratrie ; Modou a une bourse'
);
select throws_ok(
  $$ insert into public.student_discounts (school_id, academic_year_id, student_id, kind, percent) values
       ('3f000000-0000-4000-8000-000000000010', '5f600000-0000-4000-8000-000000000011', 'b0100000-0000-4000-8000-000000000011', 'scholarship', 20) $$,
  '23505', null,
  'une seule réduction par élève sur les mensualités'
);

-- Le censeur gère la pédagogie, pas les finances.
select set_config('request.jwt.claims', '{"sub": "4f000000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is_empty(
  $$ update public.fee_rates set amount = 0 returning 1 $$,
  'le censeur ne modifie pas les montants'
);

-- Le parent lit la grille et les options et réductions de son enfant seulement.
select set_config('request.jwt.claims', '{"sub": "4f000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select results_eq(
  $$ select amount from public.fee_rates $$,
  $$ values (25000) $$,
  'le parent consulte la grille des frais'
);
select results_eq(
  $$ select student_id from public.student_discounts union all select student_id from public.student_fee_options $$,
  $$ values ('b0100000-0000-4000-8000-000000000011'::uuid), ('b0100000-0000-4000-8000-000000000011'::uuid) $$,
  'il ne voit que la réduction et les options de son enfant'
);
select throws_ok(
  $$ insert into public.fee_types (school_id, name, kind, frequency) values ('3f000000-0000-4000-8000-000000000010', 'Tenue', 'uniform', 'once') $$,
  '42501', null,
  'le parent ne crée pas de frais'
);

select * from finish();
rollback;
