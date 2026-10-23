-- Appréciations par matière : enregistrement, effacement, droits, élève de la classe, verrouillage.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into public.schools (id, name, slug) values ('3b000000-0000-4000-8000-000000000010', 'École Test O', 'ecole-test-o');
insert into auth.users (id, aud, role, email) values
  ('4b000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'maths.o@test.local'),
  ('4b000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.o@test.local'),
  ('4b000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'parent.o@test.local');
insert into public.school_memberships (school_id, user_id, role) values
  ('3b000000-0000-4000-8000-000000000010', '4b000000-0000-4000-8000-000000000011', 'teacher'),
  ('3b000000-0000-4000-8000-000000000010', '4b000000-0000-4000-8000-000000000012', 'teacher'),
  ('3b000000-0000-4000-8000-000000000010', '4b000000-0000-4000-8000-000000000013', 'parent');
insert into public.academic_years (id, school_id, label, starts_on, ends_on, is_current) values
  ('5d000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', '2026-2027', current_date - 60, current_date + 200, true);
insert into public.periods (id, school_id, academic_year_id, position, label, starts_on, ends_on) values
  ('5e000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', '5d000000-0000-4000-8000-000000000011', 1, '1er semestre', current_date - 60, current_date + 60);
insert into public.cycles (id, school_id, code, label, grading_scale, position) values
  ('6b000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', 'moyen', 'Moyen', 'twenty', 2);
insert into public.levels (id, school_id, cycle_id, code, label, position) values
  ('7d000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', '6b000000-0000-4000-8000-000000000011', '6e', 'Sixième', 7);
insert into public.subjects (id, school_id, name) values
  ('7e000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', 'Mathématiques');
insert into public.level_subjects (school_id, level_id, subject_id, coefficient) values
  ('3b000000-0000-4000-8000-000000000010', '7d000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011', 4);
insert into public.school_staff (id, school_id, full_name, email, role, user_id) values
  ('8b000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', 'Prof Maths', 'maths.o@test.local', 'teacher', '4b000000-0000-4000-8000-000000000011'),
  ('8b000000-0000-4000-8000-000000000012', '3b000000-0000-4000-8000-000000000010', 'Autre Prof', 'autre.o@test.local', 'teacher', '4b000000-0000-4000-8000-000000000012');
insert into public.classes (id, school_id, academic_year_id, level_id, name) values
  ('9b000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', '5d000000-0000-4000-8000-000000000011', '7d000000-0000-4000-8000-000000000011', '6e A'),
  ('9b000000-0000-4000-8000-000000000012', '3b000000-0000-4000-8000-000000000010', '5d000000-0000-4000-8000-000000000011', '7d000000-0000-4000-8000-000000000011', '6e B');
insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id) values
  ('3b000000-0000-4000-8000-000000000010', '9b000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011', '8b000000-0000-4000-8000-000000000011');
insert into public.students (id, school_id, matricule, first_name, last_name, sex) values
  ('ac000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', 'O-001', 'Awa', 'Diop', 'F'),
  ('ac000000-0000-4000-8000-000000000012', '3b000000-0000-4000-8000-000000000010', 'O-002', 'Modou', 'Fall', 'M'),
  ('ac000000-0000-4000-8000-000000000013', '3b000000-0000-4000-8000-000000000010', 'O-003', 'Autre', 'Classe', 'M');
insert into public.enrollments (school_id, student_id, class_id, academic_year_id) values
  ('3b000000-0000-4000-8000-000000000010', 'ac000000-0000-4000-8000-000000000011', '9b000000-0000-4000-8000-000000000011', '5d000000-0000-4000-8000-000000000011'),
  ('3b000000-0000-4000-8000-000000000010', 'ac000000-0000-4000-8000-000000000012', '9b000000-0000-4000-8000-000000000011', '5d000000-0000-4000-8000-000000000011'),
  ('3b000000-0000-4000-8000-000000000010', 'ac000000-0000-4000-8000-000000000013', '9b000000-0000-4000-8000-000000000012', '5d000000-0000-4000-8000-000000000011');
insert into public.guardians (id, school_id, full_name, user_id) values
  ('cb000000-0000-4000-8000-000000000011', '3b000000-0000-4000-8000-000000000010', 'Parent Diop', '4b000000-0000-4000-8000-000000000013');
insert into public.student_guardians (school_id, student_id, guardian_id, is_primary) values
  ('3b000000-0000-4000-8000-000000000010', 'ac000000-0000-4000-8000-000000000011', 'cb000000-0000-4000-8000-000000000011', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4b000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.save_subject_appreciations('9b000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011',
       '5e000000-0000-4000-8000-000000000011',
       '{"ac000000-0000-4000-8000-000000000011": " Très bon trimestre. ", "ac000000-0000-4000-8000-000000000012": "Peut mieux faire."}') $$,
  'le professeur de maths enregistre les appréciations de sa classe'
);
select lives_ok(
  $$ select public.save_subject_appreciations('9b000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011',
       '5e000000-0000-4000-8000-000000000011',
       '{"ac000000-0000-4000-8000-000000000011": "Excellent travail.", "ac000000-0000-4000-8000-000000000012": "  "}') $$,
  'il en corrige une et en efface une autre'
);
select results_eq(
  $$ select student_id, text, updated_by from public.subject_appreciations $$,
  $$ values ('ac000000-0000-4000-8000-000000000011'::uuid, 'Excellent travail.'::text, '4b000000-0000-4000-8000-000000000011'::uuid) $$,
  'texte nettoyé, effacement pris en compte, auteur enregistré'
);
select throws_ok(
  $$ select public.save_subject_appreciations('9b000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011',
       '5e000000-0000-4000-8000-000000000011', '{"ac000000-0000-4000-8000-000000000013": "Bien."}') $$,
  'P0001', 'unknownStudent',
  'pas d''appréciation pour un élève d''une autre classe'
);
select throws_ok(
  $$ update public.subject_appreciations set class_id = '9b000000-0000-4000-8000-000000000012' $$,
  '42501', null,
  'la classe d''une appréciation ne change pas'
);

select set_config('request.jwt.claims', '{"sub": "4b000000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.save_subject_appreciations('9b000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011',
       '5e000000-0000-4000-8000-000000000011', '{"ac000000-0000-4000-8000-000000000011": "Bien."}') $$,
  'P0001', 'forbidden',
  'un autre professeur n''écrit pas les appréciations de cette matière'
);

select set_config('request.jwt.claims', '{"sub": "4b000000-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is_empty(
  $$ select 1 from public.subject_appreciations $$,
  'le parent ne lit pas les appréciations avant le bulletin'
);

reset role;
update public.periods set locked_at = now() where id = '5e000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4b000000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.save_subject_appreciations('9b000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000011',
       '5e000000-0000-4000-8000-000000000011', '{"ac000000-0000-4000-8000-000000000011": "Modifié."}') $$,
  'P0001', 'periodLocked',
  'les appréciations d''une période verrouillée ne changent plus'
);

select * from finish();
rollback;
