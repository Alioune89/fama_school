-- =============================================================================
-- Données de démonstration (développement local et tests E2E uniquement).
--
-- Comptes e-mail (mot de passe : FamaSchool2026)
--   admin@famaschool.test       équipe Fama School (super-admin)
--   directeur@famaschool.test   directeur du Groupe Scolaire Les Baobabs
--
-- Comptes téléphone (code OTP fixe 123456, voir supabase/config.toml)
--   +221 77 000 00 01  parent      — Les Baobabs
--   +221 77 000 00 02  professeur  — Les Baobabs et Al Amine (vacataire)
--   +221 77 000 00 03  censeur     — Les Baobabs
--   +221 77 000 00 04  directeur   — Al Amine
-- Les comptes téléphone sont créés à la première connexion : les invitations ci-dessous
-- sont alors rattachées automatiquement (déclencheur private.handle_new_user).
-- =============================================================================

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

insert into public.schools (id, name, slug, short_name, city, region, address, phone, email, status, plan)
values
  ('b0000000-0000-4000-8000-000000000001', 'Groupe Scolaire Les Baobabs', 'les-baobabs', 'Les Baobabs',
   'Dakar', 'Dakar', 'Sacré-Cœur 3, Dakar', '+221338000001', 'contact@lesbaobabs.test', 'active', 'pilot'),
  ('b0000000-0000-4000-8000-000000000002', 'Institut Franco-Arabe Al Amine', 'al-amine', 'Al Amine',
   'Pikine', 'Dakar', 'Pikine Icotaf', '+221338000002', 'contact@alamine.test', 'active', 'pilot');

insert into public.school_memberships (school_id, user_id, role, title)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'director', 'Directeur');

insert into public.invitations (school_id, role, phone, full_name, title, invited_by)
values
  ('b0000000-0000-4000-8000-000000000001', 'parent', '+221770000001', 'Fatou Sow', null, 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000001', 'teacher', '+221770000002', 'Awa Diop', 'Professeure de français', 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000002', 'teacher', '+221770000002', 'Awa Diop', 'Vacataire', null),
  ('b0000000-0000-4000-8000-000000000001', 'censor', '+221770000003', 'Cheikh Ba', 'Censeur', 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000002', 'director', '+221770000004', 'Ibrahima Fall', 'Directeur', null);
