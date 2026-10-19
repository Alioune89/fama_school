-- =============================================================================
-- Données de démonstration (développement local et tests E2E uniquement).
--
-- Comptes e-mail (mot de passe : FamaSchool2026)
--   admin@famaschool.test       équipe Fama School (super-admin)
--   directeur@famaschool.test   directeur du Groupe Scolaire Les Baobabs
--
-- Comptes téléphone (code OTP fixe 123456, voir supabase/config.toml)
--   +221 77 000 00 01  parent      — Les Baobabs (2 enfants)
--   +221 77 000 00 02  professeur  — Les Baobabs et Al Amine (vacataire)
--   +221 77 000 00 03  censeur     — Les Baobabs
--   +221 77 000 00 04  directeur   — Al Amine (école vide : sert à tester la mise en route)
--
-- Le répertoire (school_staff, guardians) crée les invitations ; les comptes sont reliés
-- automatiquement à la première connexion avec le même numéro.
-- =============================================================================

-- Comptes e-mail -----------------------------------------------------------------
do $$
declare
  v_user record;
begin
  for v_user in
    select *
    from (values
      ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@famaschool.test', 'Équipe Fama School'),
      ('a0000000-0000-4000-8000-000000000002'::uuid, 'directeur@famaschool.test', 'Moussa Ndiaye')
    ) as u (id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated', v_user.email,
      extensions.crypt('FamaSchool2026', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', v_user.full_name), now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_user.id, v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

insert into public.platform_admins (user_id)
values ('a0000000-0000-4000-8000-000000000001');

-- Écoles -------------------------------------------------------------------------
insert into public.schools (id, name, slug, short_name, city, region, address, phone, email, status, plan, settings)
values
  ('b0000000-0000-4000-8000-000000000001', 'Groupe Scolaire Les Baobabs', 'les-baobabs', 'Les Baobabs',
   'Dakar', 'Dakar', 'Sacré-Cœur 3, Dakar', '+221338000001', 'contact@lesbaobabs.test', 'active', 'pilot',
   '{"mentionThresholds": {"twenty": {"felicitations": 16, "encouragements": 14, "tableauHonneur": 12}, "ten": {"felicitations": 8, "encouragements": 7, "tableauHonneur": 6}}}'),
  ('b0000000-0000-4000-8000-000000000002', 'Institut Franco-Arabe Al Amine', 'al-amine', 'Al Amine',
   'Pikine', 'Dakar', 'Pikine Icotaf', '+221338000002', 'contact@alamine.test', 'active', 'pilot', '{}');

-- Direction des Baobabs (compte e-mail existant : rattachement immédiat)
insert into public.school_memberships (school_id, user_id, role, title)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'director', 'Directeur');

insert into public.school_staff (school_id, full_name, email, role, title, created_by)
values ('b0000000-0000-4000-8000-000000000001', 'Moussa Ndiaye', 'directeur@famaschool.test', 'director', 'Directeur',
        'a0000000-0000-4000-8000-000000000002');

-- Les Baobabs : année, cycles, niveaux, matières, classes ------------------------
do $$
declare
  v_school constant uuid := 'b0000000-0000-4000-8000-000000000001';
  v_director constant uuid := 'a0000000-0000-4000-8000-000000000002';
  v_year uuid;
  v_elem uuid;
  v_moyen uuid;
  v_level record;
  v_subject record;
begin
  insert into public.academic_years (school_id, label, starts_on, ends_on, period_kind, is_current)
  values (v_school, '2026-2027', '2026-10-05', '2027-07-15', 'semester', true)
  returning id into v_year;

  insert into public.periods (school_id, academic_year_id, position, label, starts_on, ends_on) values
    (v_school, v_year, 1, '1er semestre', '2026-10-05', '2027-02-13'),
    (v_school, v_year, 2, '2e semestre', '2027-02-15', '2027-07-15');

  insert into public.cycles (school_id, code, label, grading_scale, position)
  values (v_school, 'elementaire', 'Élémentaire', 'ten', 1) returning id into v_elem;
  insert into public.cycles (school_id, code, label, grading_scale, position)
  values (v_school, 'moyen', 'Moyen', 'twenty', 2) returning id into v_moyen;

  insert into public.levels (school_id, cycle_id, code, label, exam, position) values
    (v_school, v_elem, 'CI', 'Cours d''initiation', null, 1),
    (v_school, v_elem, 'CP', 'Cours préparatoire', null, 2),
    (v_school, v_elem, 'CE1', 'Cours élémentaire 1', null, 3),
    (v_school, v_elem, 'CE2', 'Cours élémentaire 2', null, 4),
    (v_school, v_elem, 'CM1', 'Cours moyen 1', null, 5),
    (v_school, v_elem, 'CM2', 'Cours moyen 2', 'CFEE', 6),
    (v_school, v_moyen, '6e', 'Sixième', null, 7),
    (v_school, v_moyen, '5e', 'Cinquième', null, 8),
    (v_school, v_moyen, '4e', 'Quatrième', null, 9),
    (v_school, v_moyen, '3e', 'Troisième', 'BFEM', 10);

  insert into public.subjects (school_id, name, short_name, subject_group, position) values
    (v_school, 'Français', 'FR', 'Lettres', 1),
    (v_school, 'Mathématiques', 'MATHS', 'Sciences', 2),
    (v_school, 'Anglais', 'ANG', 'Langues', 3),
    (v_school, 'Histoire-Géographie', 'HG', 'Lettres', 4),
    (v_school, 'Sciences de la vie et de la Terre', 'SVT', 'Sciences', 5),
    (v_school, 'Sciences physiques', 'PC', 'Sciences', 6),
    (v_school, 'Éducation civique', 'EC', 'Lettres', 7),
    (v_school, 'Éducation physique et sportive', 'EPS', 'Arts et sport', 8),
    (v_school, 'Sciences d''observation', 'SCI', 'Sciences', 9),
    (v_school, 'Arts et dessin', 'ART', 'Arts et sport', 10);

  -- Élémentaire : matières sur 10, coefficient 1
  for v_level in select id from public.levels where school_id = v_school and code in ('CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2') loop
    insert into public.level_subjects (school_id, level_id, subject_id, coefficient)
    select v_school, v_level.id, s.id, 1
    from public.subjects s
    where s.school_id = v_school and s.name in ('Français', 'Mathématiques', 'Histoire-Géographie', 'Sciences d''observation', 'Éducation civique', 'Éducation physique et sportive', 'Arts et dessin');
  end loop;

  -- Moyen : coefficients usuels (modifiables par l'école)
  for v_level in select id from public.levels where school_id = v_school and code in ('6e', '5e', '4e', '3e') loop
    for v_subject in
      select * from (values
        ('Français', 4.0), ('Mathématiques', 4.0), ('Anglais', 2.0), ('Histoire-Géographie', 2.0),
        ('Sciences de la vie et de la Terre', 2.0), ('Sciences physiques', 2.0), ('Éducation civique', 1.0),
        ('Éducation physique et sportive', 1.0)
      ) as t (name, coefficient)
    loop
      insert into public.level_subjects (school_id, level_id, subject_id, coefficient)
      select v_school, v_level.id, s.id, v_subject.coefficient
      from public.subjects s
      where s.school_id = v_school and s.name = v_subject.name;
    end loop;
  end loop;

  insert into public.classes (school_id, academic_year_id, level_id, name, room, capacity)
  select v_school, v_year, l.id, l.code || ' A', 'Salle ' || l.position, 45
  from public.levels l
  where l.school_id = v_school;

  -- Professeurs et personnel (le répertoire crée les invitations)
  insert into public.school_staff (school_id, full_name, phone, role, title, contract, created_by) values
    (v_school, 'Awa Diop', '+221770000002', 'teacher', 'Professeure de français', 'permanent', v_director),
    (v_school, 'Cheikh Ba', '+221770000003', 'censor', 'Censeur', null, v_director),
    (v_school, 'Ousmane Faye', '+221770990001', 'teacher', 'Professeur de mathématiques', 'permanent', v_director),
    (v_school, 'Mariama Ba', '+221770990002', 'teacher', 'Professeure d''anglais', 'vacataire', v_director),
    (v_school, 'Ibrahima Sarr', '+221770990003', 'teacher', 'Professeur de SVT', 'permanent', v_director),
    (v_school, 'Khady Ndiaye', '+221770990004', 'teacher', 'Professeure d''histoire-géographie', 'vacataire', v_director),
    (v_school, 'Abdoulaye Diallo', '+221770990005', 'teacher', 'Professeur d''EPS', 'vacataire', v_director),
    (v_school, 'Aïssatou Cissé', '+221770990006', 'teacher', 'Institutrice (CM2)', 'permanent', v_director),
    (v_school, 'Bineta Gueye', '+221770990007', 'accountant', 'Comptable', null, v_director),
    (v_school, 'Rokhaya Mbaye', '+221770990008', 'secretary', 'Secrétaire', null, v_director);

  -- Affectations
  insert into public.teaching_assignments (school_id, class_id, subject_id, staff_id)
  select v_school, c.id, s.id, st.id
  from public.classes c
  join public.levels l on l.id = c.level_id
  join public.subjects s on s.school_id = v_school
  join public.school_staff st on st.school_id = v_school
  where c.school_id = v_school
    and l.code in ('6e', '5e', '4e', '3e')
    and (
      (s.name = 'Français' and st.full_name = 'Awa Diop')
      or (s.name = 'Mathématiques' and st.full_name = 'Ousmane Faye')
      or (s.name = 'Anglais' and st.full_name = 'Mariama Ba')
      or (s.name = 'Sciences de la vie et de la Terre' and st.full_name = 'Ibrahima Sarr')
      or (s.name = 'Histoire-Géographie' and st.full_name = 'Khady Ndiaye')
      or (s.name = 'Éducation physique et sportive' and st.full_name = 'Abdoulaye Diallo')
    );

  update public.classes c
  set homeroom_staff_id = (select id from public.school_staff where school_id = v_school and full_name = 'Awa Diop')
  where c.school_id = v_school and c.name = '6e A';

  update public.classes c
  set homeroom_staff_id = (select id from public.school_staff where school_id = v_school and full_name = 'Aïssatou Cissé')
  where c.school_id = v_school and c.name = 'CM2 A';
end;
$$;

-- Les Baobabs : élèves et familles ------------------------------------------------
do $$
declare
  v_school constant uuid := 'b0000000-0000-4000-8000-000000000001';
  v_director constant uuid := 'a0000000-0000-4000-8000-000000000002';
  v_year uuid := (select id from public.academic_years where school_id = v_school and is_current);
  v_first_f text[] := array['Awa', 'Fatou', 'Mariama', 'Aminata', 'Khady', 'Ndeye', 'Coumba', 'Astou', 'Bineta', 'Seynabou', 'Adja', 'Dieynaba'];
  v_first_m text[] := array['Moussa', 'Mamadou', 'Ibrahima', 'Cheikh', 'Ousmane', 'Abdou', 'Modou', 'Pape', 'Serigne', 'Babacar', 'Lamine', 'Alioune'];
  v_last text[] := array['Diop', 'Ndiaye', 'Fall', 'Sow', 'Ba', 'Gueye', 'Sarr', 'Faye', 'Diallo', 'Cissé', 'Mbaye', 'Thiam', 'Seck', 'Kane'];
  v_class record;
  v_student uuid;
  v_guardian uuid;
  v_sex public.sex;
  v_first text;
  v_last_name text;
  v_index integer := 0;
  v_age integer;
begin
  -- Fatou Sow, parent de démonstration (+221 77 000 00 01) : deux enfants
  insert into public.guardians (school_id, full_name, phone, profession, created_by)
  values (v_school, 'Fatou Sow', '+221770000001', 'Commerçante', v_director)
  returning id into v_guardian;

  for v_class in
    select c.id, c.name, l.position from public.classes c join public.levels l on l.id = c.level_id
    where c.school_id = v_school and c.name in ('CE2 A', '6e A')
  loop
    insert into public.students (school_id, first_name, last_name, sex, birth_date, birth_place, nationality, created_by)
    values (
      v_school,
      case when v_class.name = '6e A' then 'Mariama' else 'Modou' end,
      'Sow',
      case when v_class.name = '6e A' then 'F'::public.sex else 'M'::public.sex end,
      make_date(2026 - (5 + v_class.position), 3, 14),
      'Dakar', 'Sénégalaise', v_director
    )
    returning id into v_student;
    insert into public.enrollments (school_id, student_id, class_id, academic_year_id, enrolled_on)
    values (v_school, v_student, v_class.id, v_year, '2026-10-05');
    insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary)
    values (v_school, v_student, v_guardian, 'mother', true);
  end loop;

  -- Quatre élèves par classe, avec un parent chacun
  for v_class in
    select c.id, c.name, l.position from public.classes c join public.levels l on l.id = c.level_id
    where c.school_id = v_school order by l.position
  loop
    for i in 1..4 loop
      v_index := v_index + 1;
      v_sex := case when v_index % 2 = 0 then 'F'::public.sex else 'M'::public.sex end;
      v_first := case when v_sex = 'F' then v_first_f[1 + (v_index * 7) % array_length(v_first_f, 1)]
                      else v_first_m[1 + (v_index * 5) % array_length(v_first_m, 1)] end;
      v_last_name := v_last[1 + (v_index * 3) % array_length(v_last, 1)];
      v_age := 5 + v_class.position;

      insert into public.students (school_id, first_name, last_name, sex, birth_date, birth_place, nationality, created_by)
      values (v_school, v_first, v_last_name, v_sex, make_date(2026 - v_age, 1 + v_index % 12, 1 + v_index % 27),
              (array['Dakar', 'Pikine', 'Rufisque', 'Thiès', 'Guédiawaye'])[1 + v_index % 5], 'Sénégalaise', v_director)
      returning id into v_student;

      insert into public.enrollments (school_id, student_id, class_id, academic_year_id, enrolled_on)
      values (v_school, v_student, v_class.id, v_year, '2026-10-05');

      insert into public.guardians (school_id, full_name, phone, created_by)
      values (
        v_school,
        (case when v_index % 3 = 0 then v_first_f[1 + v_index % array_length(v_first_f, 1)] else v_first_m[1 + v_index % array_length(v_first_m, 1)] end) || ' ' || v_last_name,
        '+2217709' || lpad((10000 + v_index)::text, 5, '0'),
        v_director
      )
      returning id into v_guardian;

      insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary)
      values (v_school, v_student, v_guardian, case when v_index % 3 = 0 then 'mother' else 'father' end::public.guardian_relationship, true);
    end loop;
  end loop;
end;
$$;

-- Al Amine : vide (mise en route à faire), avec son directeur et la vacataire -------
insert into public.school_staff (school_id, full_name, phone, role, title, contract) values
  ('b0000000-0000-4000-8000-000000000002', 'Ibrahima Fall', '+221770000004', 'director', 'Directeur', null),
  ('b0000000-0000-4000-8000-000000000002', 'Awa Diop', '+221770000002', 'teacher', 'Vacataire', 'vacataire');
