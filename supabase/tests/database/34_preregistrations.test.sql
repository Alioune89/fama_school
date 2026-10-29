-- Pré-inscriptions : dépôt public (site publié seulement, pièces jointes vérifiées, limite par numéro),
-- lecture réservée à la direction, notification, inscription en un clic.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into public.schools (id, name, slug) values
  ('3f340000-0000-4000-8000-000000000010', 'École Test P', 'ecole-test-preinscription'),
  ('3f340000-0000-4000-8000-000000000020', 'École Sans Site', 'ecole-sans-site');
insert into auth.users (id, aud, role, email) values
  ('4f340000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'directeur.p@test.local'),
  ('4f340000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'prof.p@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3f340000-0000-4000-8000-000000000010', '4f340000-0000-4000-8000-000000000011', 'director'),
  ('3f340000-0000-4000-8000-000000000010', '4f340000-0000-4000-8000-000000000012', 'teacher');
insert into public.school_sites (school_id, published) values ('3f340000-0000-4000-8000-000000000010', true);
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5f340000-0000-4000-8000-000000000011', '3f340000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6f340000-0000-4000-8000-000000000011', '3f340000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7f340000-0000-4000-8000-000000000011', '3f340000-0000-4000-8000-000000000010', '6f340000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9f340000-0000-4000-8000-000000000011', '3f340000-0000-4000-8000-000000000010', '5f340000-0000-4000-8000-000000000011', '7f340000-0000-4000-8000-000000000011', '6e A');
insert into storage.objects (bucket_id, name) values
  ('preregistrations', '3f340000-0000-4000-8000-000000000010/a1340000-0000-4000-8000-000000000001.jpg');

create temporary table request_data as select jsonb_build_object(
  'level_id', '7f340000-0000-4000-8000-000000000011',
  'child_first_name', 'Khady', 'child_last_name', 'Ndiaye', 'child_sex', 'F', 'child_birth_date', '2015-03-12',
  'guardian_name', 'Moussa Ndiaye', 'guardian_phone', '+221770001122', 'guardian_relationship', 'father',
  'attachments', jsonb_build_array(jsonb_build_object(
    'path', '3f340000-0000-4000-8000-000000000010/a1340000-0000-4000-8000-000000000001.jpg', 'name', 'extrait.jpg'))
) as data;
grant select on request_data to anon, authenticated;

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(
  public.preregistration_levels('ecole-test-preinscription') -> 0 ->> 'label', 'Sixième',
  'un visiteur voit les niveaux proposés par une école au site publié'
);
select throws_ok(
  $$ select public.submit_preregistration('ecole-sans-site', (select data from request_data)) $$,
  'P0001', 'unknownSchool', 'pas de pré-inscription sans site publié'
);
select throws_ok(
  $$ select public.submit_preregistration('ecole-test-preinscription',
       (select data || '{"attachments": [{"path": "3f340000-0000-4000-8000-000000000010/b1340000-0000-4000-8000-000000000001.jpg", "name": "x.jpg"}]}' from request_data)) $$,
  'P0001', 'invalidAttachment', 'une pièce jointe absente du stockage est refusée'
);
select matches(
  public.submit_preregistration('ecole-test-preinscription', (select data from request_data)),
  '^P\d{4}-0001$', 'un parent dépose une demande et reçoit sa référence'
);
select throws_ok(
  $$ select public.submit_preregistration('ecole-test-preinscription', (select data from request_data)) $$,
  'P0001', 'invalidAttachment', 'une pièce jointe ne sert qu''à une seule demande'
);
select public.submit_preregistration('ecole-test-preinscription', (select data - 'attachments' from request_data));
select public.submit_preregistration('ecole-test-preinscription', (select data - 'attachments' from request_data));
select throws_ok(
  $$ select public.submit_preregistration('ecole-test-preinscription', (select data - 'attachments' from request_data)) $$,
  'P0001', 'tooManyRequests', 'au plus 3 demandes par numéro sur 24 heures'
);
select throws_ok($$ select * from public.preregistrations $$, '42501', null, 'un visiteur ne lit pas les demandes');

reset role;
select is(
  (select count(*)::integer from public.notifications
   where user_id = '4f340000-0000-4000-8000-000000000011' and kind = 'preregistration'),
  3, 'le directeur est notifié de chaque demande'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f340000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is((select count(*)::integer from public.preregistrations), 0, 'un enseignant ne voit pas les demandes');

select set_config('request.jwt.claims', '{"sub": "4f340000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is((select count(*)::integer from public.preregistrations), 3, 'le directeur voit les demandes de son école');
update public.preregistrations set status = 'accepted', decision_note = 'Entretien jeudi'
where reference like 'P%-0001';
select is(
  (select decided_by from public.preregistrations where reference like 'P%-0001'),
  '4f340000-0000-4000-8000-000000000011'::uuid, 'la décision est signée par son auteur'
);
select public.enroll_preregistration(
  (select id from public.preregistrations where reference like 'P%-0001'), '9f340000-0000-4000-8000-000000000011');
select is(
  (select s.first_name || ' ' || g.full_name from public.preregistrations p
   join public.students s on s.id = p.student_id
   join public.student_guardians sg on sg.student_id = s.id join public.guardians g on g.id = sg.guardian_id
   where p.reference like 'P%-0001' and p.status = 'enrolled'),
  'Khady Moussa Ndiaye', 'l''inscription crée l''élève avec son parent'
);
select throws_ok(
  $$ update public.preregistrations set status = 'rejected' where reference like 'P%-0001' $$,
  'P0001', 'alreadyEnrolled', 'une demande inscrite est close'
);

select * from finish();
rollback;
