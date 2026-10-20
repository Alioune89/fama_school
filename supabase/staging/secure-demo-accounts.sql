-- =============================================================================
-- Staging : à lancer une fois après le chargement de seed.sql sur le projet cloud.
--
-- Le seed crée des comptes au mot de passe public (FamaSchool2026). Sur un staging joignable
-- par tous, le compte « équipe Fama School » verrait les vraies demandes de démo : on lui donne
-- un mot de passe fort, et au directeur de démonstration celui que l'on communique aux prospects.
--
--   psql "$STAGING_DB_URL" \
--     -v admin_password='…' -v demo_password='…' \
--     -f supabase/staging/secure-demo-accounts.sql
-- =============================================================================
\set ON_ERROR_STOP on

begin;

update auth.users
set encrypted_password = extensions.crypt(:'admin_password', extensions.gen_salt('bf')), updated_at = now()
where email = 'admin@famaschool.test';

update auth.users
set encrypted_password = extensions.crypt(:'demo_password', extensions.gen_salt('bf')), updated_at = now()
where email = 'directeur@famaschool.test';

-- Les numéros de démonstration (+221 77 000 00 0x) restent utilisables avec leur code fixe,
-- déclarés comme numéros de test dans le tableau de bord Supabase (Auth > Phone).

commit;
