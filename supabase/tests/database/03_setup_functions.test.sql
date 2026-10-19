-- Mise en route : remplacement atomique de la grille des coefficients.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into public.schools (id, name, slug) values ('31000000-0000-4000-8000-00000000000e', 'École Test E', 'ecole-test-e');
insert into auth.users (id, aud, role, email) values
  ('41000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'censeur.e@test.local'),
  ('41000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'prof.e@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('31000000-0000-4000-8000-00000000000e', '41000000-0000-4000-8000-0000000000e1', 'censor'),
  ('31000000-0000-4000-8000-00000000000e', '41000000-0000-4000-8000-0000000000e2', 'teacher');
insert into public.cycles (id, school_id, code, label, grading_scale) values
  ('61000000-0000-4000-8000-0000000000e1', '31000000-0000-4000-8000-00000000000e', 'moyen', 'Moyen', 'twenty');
insert into public.levels (id, school_id, cycle_id, code, label) values
  ('71000000-0000-4000-8000-0000000000e1', '31000000-0000-4000-8000-00000000000e', '61000000-0000-4000-8000-0000000000e1', '6e', 'Sixième'),
  ('71000000-0000-4000-8000-0000000000e2', '31000000-0000-4000-8000-00000000000e', '61000000-0000-4000-8000-0000000000e1', '5e', 'Cinquième');
insert into public.subjects (id, school_id, name) values
  ('81000000-0000-4000-8000-0000000000e1', '31000000-0000-4000-8000-00000000000e', 'Français'),
  ('81000000-0000-4000-8000-0000000000e2', '31000000-0000-4000-8000-00000000000e', 'Mathématiques');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('31000000-0000-4000-8000-00000000000e', '71000000-0000-4000-8000-0000000000e1', '81000000-0000-4000-8000-0000000000e1', 3),
  ('31000000-0000-4000-8000-00000000000e', '71000000-0000-4000-8000-0000000000e2', '81000000-0000-4000-8000-0000000000e2', 4);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "41000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

select is(
  public.replace_level_subjects(
    '31000000-0000-4000-8000-00000000000e',
    '[{"level_id": "71000000-0000-4000-8000-0000000000e1", "subject_id": "81000000-0000-4000-8000-0000000000e1", "coefficient": 4},
      {"level_id": "71000000-0000-4000-8000-0000000000e1", "subject_id": "81000000-0000-4000-8000-0000000000e2", "coefficient": 4}]'::jsonb
  ),
  2,
  'le censeur remplace la grille des coefficients'
);

select results_eq(
  $$ select l.code || ' ' || s.name || ' ' || ls.coefficient::text
     from public.level_subjects ls join public.levels l on l.id = ls.level_id join public.subjects s on s.id = ls.subject_id
     where ls.school_id = '31000000-0000-4000-8000-00000000000e' order by 1 $$,
  $$ values ('6e Français 4.0'), ('6e Mathématiques 4.0') $$,
  'la grille contient exactement l''ensemble fourni (mise à jour, ajout, suppression)'
);

select set_config('request.jwt.claims', '{"sub": "41000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.replace_level_subjects(
       '31000000-0000-4000-8000-00000000000e',
       '[{"level_id": "71000000-0000-4000-8000-0000000000e2", "subject_id": "81000000-0000-4000-8000-0000000000e1", "coefficient": 9}]'::jsonb) $$,
  '42501',
  null,
  'un professeur ne peut pas modifier les coefficients, même en appelant la fonction'
);

reset role;

select is(
  (select count(*)::int from public.level_subjects where school_id = '31000000-0000-4000-8000-00000000000e'),
  2,
  'la tentative refusée n''a rien supprimé (transaction annulée)'
);

select * from finish();
rollback;
