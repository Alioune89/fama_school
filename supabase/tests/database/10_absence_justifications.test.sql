-- Justificatifs d'absence : envoi par le parent, stockage privé, décision de la direction, absences justifiées.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into public.schools (id, name, slug) values ('37000000-0000-4000-8000-00000000000e', 'École Test K', 'ecole-test-k');
insert into auth.users (id, aud, role, email) values
  ('47000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'directeur.k@test.local'),
  ('47000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'prof.k@test.local'),
  ('47000000-0000-4000-8000-0000000000e4', 'authenticated', 'authenticated', 'parent.k@test.local'),
  ('47000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', 'autre.parent.k@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('37000000-0000-4000-8000-00000000000e', '47000000-0000-4000-8000-0000000000e1', 'director'),
  ('37000000-0000-4000-8000-00000000000e', '47000000-0000-4000-8000-0000000000e2', 'teacher'),
  ('37000000-0000-4000-8000-00000000000e', '47000000-0000-4000-8000-0000000000e4', 'parent'),
  ('37000000-0000-4000-8000-00000000000e', '47000000-0000-4000-8000-0000000000e5', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('57000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('67000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', 'elementaire', 'Élémentaire', 'ten', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('77000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', '67000000-0000-4000-8000-0000000000e1', 'CM1', 'Cours moyen 1', 5);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('87000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', 'Moussa Directeur', 'directeur.k@test.local', 'director', '47000000-0000-4000-8000-0000000000e1');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('97000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', '57000000-0000-4000-8000-0000000000e1', '77000000-0000-4000-8000-0000000000e1', 'CM1 A');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('a7000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', 'K-001', 'Binta', 'Fall', 'F'),
  ('a7000000-0000-4000-8000-0000000000e2', '37000000-0000-4000-8000-00000000000e', 'K-002', 'Ousmane', 'Ba', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('37000000-0000-4000-8000-00000000000e', 'a7000000-0000-4000-8000-0000000000e1', '97000000-0000-4000-8000-0000000000e1', '57000000-0000-4000-8000-0000000000e1'),
  ('37000000-0000-4000-8000-00000000000e', 'a7000000-0000-4000-8000-0000000000e2', '97000000-0000-4000-8000-0000000000e1', '57000000-0000-4000-8000-0000000000e1');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('c7000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', 'Aminata Fall', '47000000-0000-4000-8000-0000000000e4'),
  ('c7000000-0000-4000-8000-0000000000e2', '37000000-0000-4000-8000-00000000000e', 'Ibrahima Ba', '47000000-0000-4000-8000-0000000000e5');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('37000000-0000-4000-8000-00000000000e', 'a7000000-0000-4000-8000-0000000000e1', 'c7000000-0000-4000-8000-0000000000e1', true),
  ('37000000-0000-4000-8000-00000000000e', 'a7000000-0000-4000-8000-0000000000e2', 'c7000000-0000-4000-8000-0000000000e2', true);

-- Binta absente hier (matin et après-midi) et il y a 5 jours (matin).
insert into public.attendance_sessions (id, school_id, class_id, date, slot, taken_at) values
  ('b7000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', '97000000-0000-4000-8000-0000000000e1', current_date - 1, 'morning', now()),
  ('b7000000-0000-4000-8000-0000000000e2', '37000000-0000-4000-8000-00000000000e', '97000000-0000-4000-8000-0000000000e1', current_date - 1, 'afternoon', now()),
  ('b7000000-0000-4000-8000-0000000000e3', '37000000-0000-4000-8000-00000000000e', '97000000-0000-4000-8000-0000000000e1', current_date - 5, 'morning', now());
insert into public.attendance_records (session_id, school_id, class_id, date, student_id, status) values
  ('b7000000-0000-4000-8000-0000000000e1', '37000000-0000-4000-8000-00000000000e', '97000000-0000-4000-8000-0000000000e1', current_date - 1, 'a7000000-0000-4000-8000-0000000000e1', 'absent'),
  ('b7000000-0000-4000-8000-0000000000e2', '37000000-0000-4000-8000-00000000000e', '97000000-0000-4000-8000-0000000000e1', current_date - 1, 'a7000000-0000-4000-8000-0000000000e1', 'absent'),
  ('b7000000-0000-4000-8000-0000000000e3', '37000000-0000-4000-8000-00000000000e', '97000000-0000-4000-8000-0000000000e1', current_date - 5, 'a7000000-0000-4000-8000-0000000000e1', 'absent');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "47000000-0000-4000-8000-0000000000e4", "role": "authenticated"}', true);

-- Stockage : le parent dépose la photo dans le dossier de son enfant, pas ailleurs.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('absence-justifications',
             '37000000-0000-4000-8000-00000000000e/a7000000-0000-4000-8000-0000000000e1/d7000000-0000-4000-8000-0000000000e1.jpg',
             '47000000-0000-4000-8000-0000000000e4') $$,
  'le parent dépose une photo dans le dossier de son enfant'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('absence-justifications',
             '37000000-0000-4000-8000-00000000000e/a7000000-0000-4000-8000-0000000000e2/d7000000-0000-4000-8000-0000000000e2.jpg',
             '47000000-0000-4000-8000-0000000000e4') $$,
  '42501', null,
  'pas de dépôt dans le dossier d''un autre élève'
);

select isnt(
  public.submit_absence_justification(
     'a7000000-0000-4000-8000-0000000000e1', current_date - 1, current_date - 1, 'illness', '  Fièvre, consultation au dispensaire.  ',
     '37000000-0000-4000-8000-00000000000e/a7000000-0000-4000-8000-0000000000e1/d7000000-0000-4000-8000-0000000000e1.jpg', 'image/jpeg'),
  null,
  'le parent envoie un justificatif avec la photo'
);

select results_eq(
  $$ select status::text, submitted_by_name, comment, school_id from public.absence_justifications $$,
  $$ values ('pending'::text, 'Aminata Fall'::text, 'Fièvre, consultation au dispensaire.'::text, '37000000-0000-4000-8000-00000000000e'::uuid) $$,
  'en attente, avec le nom du parent et le motif nettoyé'
);

select lives_ok(
  $$ select public.submit_absence_justification('a7000000-0000-4000-8000-0000000000e1', current_date - 5, current_date - 5,
       'family', 'Décès dans la famille', null, null) $$,
  'un justificatif sans photo, avec un motif écrit'
);

select throws_ok(
  $$ select public.submit_absence_justification('a7000000-0000-4000-8000-0000000000e1', current_date - 2, current_date - 2,
       'other', '   ', null, null) $$,
  'P0001', 'missingProof',
  'une photo ou un motif écrit est obligatoire'
);

select throws_ok(
  $$ select public.submit_absence_justification('a7000000-0000-4000-8000-0000000000e1', current_date - 40, current_date - 39,
       'illness', 'Trop ancien', null, null) $$,
  'P0001', 'invalidDates',
  'pas de justificatif au-delà de 30 jours'
);

select throws_ok(
  $$ select public.submit_absence_justification('a7000000-0000-4000-8000-0000000000e1', current_date - 1, current_date - 1,
       'illness', null,
       '37000000-0000-4000-8000-00000000000e/a7000000-0000-4000-8000-0000000000e1/d7000000-0000-4000-8000-0000000000e9.jpg', 'image/jpeg') $$,
  'P0001', 'invalidFile',
  'la photo doit avoir été déposée'
);

select throws_ok(
  $$ select public.submit_absence_justification('a7000000-0000-4000-8000-0000000000e2', current_date - 1, current_date - 1,
       'illness', 'Pas mon enfant', null, null) $$,
  'P0001', 'forbidden',
  'un parent ne justifie pas l''absence d''un autre élève'
);

select throws_ok(
  $$ insert into public.absence_justifications (school_id, student_id, from_date, to_date, reason, comment, submitted_by_name)
     values ('37000000-0000-4000-8000-00000000000e', 'a7000000-0000-4000-8000-0000000000e1', current_date, current_date,
             'other', 'Écriture directe', 'Faux nom') $$,
  '42501', null,
  'un justificatif ne s''écrit pas directement'
);

select throws_ok(
  $$ select public.review_absence_justification((select id from public.absence_justifications where reason = 'illness'), 'accepted', null) $$,
  'P0001', 'forbidden',
  'le parent n''accepte pas son propre justificatif'
);

-- L'autre parent ne voit rien.
select set_config('request.jwt.claims', '{"sub": "47000000-0000-4000-8000-0000000000e5", "role": "authenticated"}', true);
select is((select count(*)::int from public.absence_justifications), 0, 'un autre parent ne voit pas les justificatifs');

-- Un enseignant ne décide pas.
select set_config('request.jwt.claims', '{"sub": "47000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.review_absence_justification((select id from public.absence_justifications where reason = 'illness'), 'accepted', null) $$,
  'P0001', 'notFound',
  'un enseignant ne voit ni ne traite les justificatifs'
);

-- La direction accepte l'un, refuse l'autre.
select set_config('request.jwt.claims', '{"sub": "47000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.review_absence_justification((select id from public.absence_justifications where reason = 'illness'), 'accepted', null) $$,
  'le directeur accepte le certificat'
);
select lives_ok(
  $$ select public.review_absence_justification((select id from public.absence_justifications where reason = 'family'), 'refused',
       ' Merci de passer au secrétariat. ') $$,
  'le directeur refuse avec une remarque'
);

select results_eq(
  $$ select reason::text, status::text, reviewed_by_name, review_note from public.absence_justifications order by from_date desc $$,
  $$ values ('illness'::text, 'accepted'::text, 'Moussa Directeur'::text, null::text),
            ('family'::text, 'refused'::text, 'Moussa Directeur'::text, 'Merci de passer au secrétariat.'::text) $$,
  'la décision garde le nom du directeur et sa remarque'
);

select results_eq(
  $$ select absences, justified from public.attendance_absence_summary('37000000-0000-4000-8000-00000000000e', current_date - 29, current_date) $$,
  $$ values (3, 2) $$,
  'les deux demi-journées couvertes par le certificat accepté sont justifiées'
);

-- Le parent ne retire plus un justificatif traité.
select set_config('request.jwt.claims', '{"sub": "47000000-0000-4000-8000-0000000000e4", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.withdraw_absence_justification((select id from public.absence_justifications where reason = 'illness')) $$,
  'P0001', 'alreadyReviewed',
  'un justificatif traité ne se retire plus'
);

select * from finish();
rollback;
