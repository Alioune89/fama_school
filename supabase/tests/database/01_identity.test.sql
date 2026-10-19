-- Identité multi-écoles : isolement entre écoles, droits par rôle, invitations, audit.
begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- ---------------------------------------------------------------------------
-- Données de test (indépendantes du seed)
-- ---------------------------------------------------------------------------
insert into public.schools (id, name, slug) values
  ('10000000-0000-4000-8000-00000000000a', 'École Test A', 'ecole-test-a'),
  ('10000000-0000-4000-8000-00000000000b', 'École Test B', 'ecole-test-b');

insert into auth.users (id, aud, role, email) values
  ('20000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'dir.a@test.local'),
  ('20000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'dir.b@test.local'),
  ('20000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'outsider@test.local'),
  ('20000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'admin@test.local'),
  ('20000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'secretaire.a@test.local');

insert into public.school_memberships (school_id, user_id, role) values
  ('10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-0000000000a1', 'director'),
  ('10000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-0000000000b1', 'director'),
  ('10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-0000000000e1', 'secretary');

insert into public.platform_admins (user_id) values ('20000000-0000-4000-8000-0000000000d1');

-- ---------------------------------------------------------------------------
-- Profils et invitations
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.profiles where id = '20000000-0000-4000-8000-0000000000a1'),
  1,
  'un profil est créé automatiquement pour chaque nouveau compte'
);

-- Invitation d'un professeur avant qu'il ait un compte…
insert into public.invitations (school_id, role, phone, full_name, invited_by)
values ('10000000-0000-4000-8000-00000000000a', 'teacher', '+221709990001', 'Prof Test', '20000000-0000-4000-8000-0000000000a1');

-- …puis première connexion par téléphone (auth.users stocke le numéro sans « + »).
insert into auth.users (id, aud, role, phone)
values ('20000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', '221709990001');

select is(
  (select role::text from public.school_memberships
   where user_id = '20000000-0000-4000-8000-0000000000f1' and school_id = '10000000-0000-4000-8000-00000000000a'),
  'teacher',
  'l''invitation est rattachée automatiquement à la première connexion'
);

select is(
  (select phone from public.profiles where id = '20000000-0000-4000-8000-0000000000f1'),
  '+221709990001',
  'le numéro du profil est normalisé au format E.164'
);

select is(
  (select full_name from public.profiles where id = '20000000-0000-4000-8000-0000000000f1'),
  'Prof Test',
  'le nom saisi dans l''invitation complète le profil'
);

select isnt(
  (select accepted_at from public.invitations where phone = '+221709990001'),
  null,
  'l''invitation est marquée comme acceptée'
);

-- Invitation envoyée à un compte qui existe déjà : rattachement immédiat.
insert into public.invitations (school_id, role, phone, invited_by)
values ('10000000-0000-4000-8000-00000000000b', 'teacher', '+221709990001', '20000000-0000-4000-8000-0000000000b1');

select is(
  (select count(*)::int from public.school_memberships where user_id = '20000000-0000-4000-8000-0000000000f1'),
  2,
  'un vacataire invité par une seconde école y est rattaché sans nouvelle connexion'
);

-- ---------------------------------------------------------------------------
-- Directeur de l'école A
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

select results_eq(
  'select slug from public.schools order by slug',
  $$ values ('ecole-test-a'::text) $$,
  'le directeur de A ne voit que son école'
);

select is(
  (select count(*)::int from public.school_memberships where school_id = '10000000-0000-4000-8000-00000000000b'),
  0,
  'le directeur de A ne voit aucun membre de l''école B'
);

select is(
  (select count(*)::int from public.school_memberships where school_id = '10000000-0000-4000-8000-00000000000a'),
  3,
  'le directeur de A voit tous les membres de son école'
);

select lives_ok(
  $$ insert into public.invitations (school_id, role, phone, invited_by)
     values ('10000000-0000-4000-8000-00000000000a', 'parent', '+221709990002', '20000000-0000-4000-8000-0000000000a1') $$,
  'le directeur de A peut inviter un parent dans son école'
);

select throws_ok(
  $$ insert into public.invitations (school_id, role, phone, invited_by)
     values ('10000000-0000-4000-8000-00000000000b', 'parent', '+221709990003', '20000000-0000-4000-8000-0000000000a1') $$,
  '42501',
  null,
  'le directeur de A ne peut pas inviter dans l''école B'
);

select lives_ok(
  $$ update public.schools set city = 'Rufisque' where id = '10000000-0000-4000-8000-00000000000a' $$,
  'le directeur peut modifier les coordonnées de son école'
);

select throws_ok(
  $$ update public.schools set plan = 'group' where id = '10000000-0000-4000-8000-00000000000a' $$,
  '42501',
  null,
  'le directeur ne peut pas changer sa formule d''abonnement'
);

select cmp_ok(
  (select count(*)::int from public.audit_log where school_id = '10000000-0000-4000-8000-00000000000a'),
  '>',
  0,
  'le directeur lit le journal d''audit de son école'
);

select cmp_ok(
  (select count(*)::int from public.profiles),
  '>=',
  3,
  'le directeur voit les profils des membres de son école'
);

-- ---------------------------------------------------------------------------
-- Secrétaire de l'école A
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "20000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.invitations (school_id, role, phone, invited_by)
     values ('10000000-0000-4000-8000-00000000000a', 'teacher', '+221709990004', '20000000-0000-4000-8000-0000000000e1') $$,
  'le secrétariat peut inviter un professeur'
);

select throws_ok(
  $$ insert into public.invitations (school_id, role, phone, invited_by)
     values ('10000000-0000-4000-8000-00000000000a', 'director', '+221709990005', '20000000-0000-4000-8000-0000000000e1') $$,
  '42501',
  null,
  'le secrétariat ne peut pas nommer un directeur'
);

select throws_ok(
  $$ insert into public.school_memberships (school_id, user_id, role)
     values ('10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-0000000000e1', 'owner') $$,
  '42501',
  null,
  'le secrétariat ne peut pas s''attribuer un rôle'
);

-- ---------------------------------------------------------------------------
-- Professeur (rattaché par invitation)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "20000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.schools),
  2,
  'le vacataire voit ses deux écoles'
);

select is(
  (select count(*)::int from public.school_memberships),
  2,
  'un professeur ne voit que ses propres appartenances'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'un professeur ne voit que son propre profil'
);

select throws_ok(
  $$ insert into public.invitations (school_id, role, phone, invited_by)
     values ('10000000-0000-4000-8000-00000000000a', 'parent', '+221709990006', '20000000-0000-4000-8000-0000000000f1') $$,
  '42501',
  null,
  'un professeur ne peut pas envoyer d''invitation'
);

select is(
  (select count(*)::int from public.audit_log),
  0,
  'un professeur ne lit pas le journal d''audit'
);

-- ---------------------------------------------------------------------------
-- Compte sans école, puis équipe Fama School
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "20000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.schools),
  0,
  'un compte sans invitation ne voit aucune école'
);

select set_config('request.jwt.claims', '{"sub": "20000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);

select cmp_ok(
  (select count(*)::int from public.schools),
  '>=',
  2,
  'l''équipe Fama School voit toutes les écoles'
);

reset role;
select * from finish();
rollback;
