-- Site vitrine : brouillon invisible du public, aperçu pour le personnel, publication, rédaction réservée.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.schools (id, name, slug, city) values ('3f330000-0000-4000-8000-000000000010', 'École Test V', 'ecole-test-vitrine', 'Thiès');
insert into auth.users (id, aud, role, email) values
  ('4f330000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'directeur.v@test.local'),
  ('4f330000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.v@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f330000-0000-4000-8000-000000000010', '4f330000-0000-4000-8000-000000000011', 'director'),
  ('3f330000-0000-4000-8000-000000000010', '4f330000-0000-4000-8000-000000000012', 'teacher');
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f330000-0000-4000-8000-000000000011', '3f330000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (school_id, cycle_id, code, label, position) values
  ('3f330000-0000-4000-8000-000000000010', '6f330000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f330000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.school_sites (school_id, tagline) values ('3f330000-0000-4000-8000-000000000010', 'Intrus') $$,
  '42501', null,
  'un enseignant ne rédige pas le site'
);

select set_config('request.jwt.claims', '{"sub": "4f330000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ insert into public.school_sites (school_id, tagline, faq) values
       ('3f330000-0000-4000-8000-000000000010', 'Apprendre et réussir à Thiès', '[{"question": "Cantine ?", "answer": "Oui"}]') $$,
  'le directeur rédige le site'
);
select is(
  public.public_school_site('ecole-test-vitrine', true) ->> 'tagline',
  'Apprendre et réussir à Thiès',
  'il en voit l''aperçu avant publication'
);
select is(
  public.public_school_site('ecole-test-vitrine', true) -> 'cycles' -> 0 -> 'levels' ->> 0,
  'Sixième',
  'le cursus est déduit des niveaux de l''école'
);

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(public.public_school_site('ecole-test-vitrine', true), null, 'un visiteur ne voit pas un site non publié, même en aperçu');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f330000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
update public.school_sites set published = true, published_at = now() where school_id = '3f330000-0000-4000-8000-000000000010';
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(public.public_school_site('ecole-test-vitrine') ->> 'name', 'École Test V', 'une fois publié, le site est public');
select throws_ok($$ select * from public.school_sites $$, '42501', null, 'mais la table elle-même reste fermée aux visiteurs');

select * from finish();
rollback;
