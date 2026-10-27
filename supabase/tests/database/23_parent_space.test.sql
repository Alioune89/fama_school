-- Espace parents : prochaines compositions de ses seuls enfants ; consentements personnels.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into public.schools (id, name, slug) values ('3f230000-0000-4000-8000-000000000010', 'École Test X', 'ecole-test-x');
insert into auth.users (id, aud, role, email) values
  ('4f230000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.x@test.local'),
  ('4f230000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.x@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f230000-0000-4000-8000-000000000010', '4f230000-0000-4000-8000-000000000011', 'parent'),
  ('3f230000-0000-4000-8000-000000000010', '4f230000-0000-4000-8000-000000000012', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f840000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on) values
  ('5f850000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', '5f840000-0000-4000-8000-000000000011',
   1, '1er semestre', current_date - 60, current_date + 90);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f230000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f230000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', '6f230000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f230000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', '5f840000-0000-4000-8000-000000000011', '7f230000-0000-4000-8000-000000000011', '6e A');
insert into public.subjects (id, school_id, name) values
  ('8f230000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', 'Français'),
  ('8f230000-0000-4000-8000-000000000012', '3f230000-0000-4000-8000-000000000010', 'Mathématiques');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('3f230000-0000-4000-8000-000000000010', '7f230000-0000-4000-8000-000000000011', '8f230000-0000-4000-8000-000000000011', 3),
  ('3f230000-0000-4000-8000-000000000010', '7f230000-0000-4000-8000-000000000011', '8f230000-0000-4000-8000-000000000012', 3);
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('b0330000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', 'X-001', 'Awa', 'Sarr', 'F');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3f230000-0000-4000-8000-000000000010', 'b0330000-0000-4000-8000-000000000011', '9f230000-0000-4000-8000-000000000011', '5f840000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cf230000-0000-4000-8000-000000000011', '3f230000-0000-4000-8000-000000000010', 'Parent Sarr', '4f230000-0000-4000-8000-000000000011');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3f230000-0000-4000-8000-000000000010', 'b0330000-0000-4000-8000-000000000011', 'cf230000-0000-4000-8000-000000000011', true);
-- Compositions non publiées : maths dans 10 jours, français dans 20 jours, une passée.
insert into public.evaluations (school_id, class_id, subject_id, period_id, kind, title, held_on, max_score) values
  ('3f230000-0000-4000-8000-000000000010', '9f230000-0000-4000-8000-000000000011', '8f230000-0000-4000-8000-000000000012',
   '5f850000-0000-4000-8000-000000000011', 'composition', 'Composition de maths', current_date + 10, 20),
  ('3f230000-0000-4000-8000-000000000010', '9f230000-0000-4000-8000-000000000011', '8f230000-0000-4000-8000-000000000011',
   '5f850000-0000-4000-8000-000000000011', 'composition', 'Composition de français', current_date + 20, 20);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f230000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.evaluations $$, 'le parent ne voit pas les compositions non publiées…');
select results_eq(
  $$ select e ->> 'subject', (e ->> 'heldOn')::date - current_date
     from jsonb_array_elements(public.upcoming_compositions(array['b0330000-0000-4000-8000-000000000011']::uuid[])) e $$,
  $$ values ('Mathématiques'::text, 10) $$,
  '… mais connaît la prochaine composition de son enfant (la plus proche)'
);

select set_config('request.jwt.claims', '{"sub": "4f230000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is(
  public.upcoming_compositions(array['b0330000-0000-4000-8000-000000000011']::uuid[]),
  '[]'::jsonb,
  'rien pour l''enfant d''un autre parent'
);

-- Consentements.
select set_config('request.jwt.claims', '{"sub": "4f230000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.user_consents (kind, granted, policy_version) values ('data', true, '2026-10'), ('photos', false, '2026-10') $$,
  'le parent enregistre ses consentements'
);
select lives_ok(
  $$ update public.user_consents set granted = true where kind = 'photos' $$,
  'et peut changer d''avis'
);
select throws_ok(
  $$ insert into public.user_consents (user_id, kind, granted, policy_version)
     values ('4f230000-0000-4000-8000-000000000012', 'data', true, '2026-10') $$,
  '42501', null,
  'personne ne consent à la place d''un autre'
);
select set_config('request.jwt.claims', '{"sub": "4f230000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is_empty($$ select 1 from public.user_consents $$, 'chacun ne voit que ses consentements');
select throws_ok(
  $$ insert into public.user_consents (kind, granted, policy_version) values ('camera', true, '2026-10') $$,
  '23514', null,
  'seuls les consentements prévus existent'
);

select * from finish();
rollback;
