-- Audit de sécurité (Lot 7.4) : invariants vérifiés à chaque CI. Une nouvelle table, fonction ou politique qui
-- les enfreint fait échouer ce test : l'ajouter aux listes autorisées ci-dessous seulement après relecture.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

select is_empty(
  $$ select c.relname || ' ' || p.privilege_type
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join lateral unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p(privilege_type)
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
       and has_table_privilege('anon', c.oid, p.privilege_type) $$,
  'un visiteur anonyme n''a aucun droit sur les tables'
);

select is(
  (select string_agg(p.proname::text, ',' order by p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  'preregistration_levels,public_school_site,submit_preregistration,verify_report_card',
  'un visiteur anonyme n''appelle que le site vitrine publié, la pré-inscription et la vérification publique des bulletins et reçus'
);

select is_empty(
  $$ select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not coalesce(array_to_string(p.proconfig, ',') like '%search_path%', false) $$,
  'toute fonction à privilèges fixe son search_path'
);

select is_empty(
  $$ select tablename || '.' || policyname from pg_policies
     where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true') $$,
  'aucune politique n''autorise une écriture sans condition'
);

select is(
  (select string_agg(tablename::text, ',' order by tablename::text) from pg_policies
   where schemaname = 'public' and cmd = 'SELECT' and qual = 'true'),
  'staff_availability',
  'seuls les horaires des professeurs sont lisibles par tout compte connecté'
);

select is_empty(
  $$ select table_name || ' ' || grantee from information_schema.role_table_grants
     where table_schema = 'private' and grantee in ('anon', 'authenticated') $$,
  'les tables internes (schéma private) ne sont accessibles qu''au travers des fonctions'
);

select is(
  (select string_agg(id::text, ',' order by id::text) from storage.buckets where public),
  'school-logos,school-sites',
  'seuls les logos et les photos des sites vitrines sont publics dans le stockage'
);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('settle_online_payment', 'set_online_payment_checkout', 'claim_deliveries', 'finish_delivery',
                         'release_stuck_deliveries', 'prune_notifications')
       and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')) $$,
  'les fonctions du serveur (paiement en ligne, envois, ménage) restent fermées aux comptes'
);

-- Fonctions à privilèges ouvertes aux comptes connectés : chacune vérifie elle-même les droits de l'appelant
-- (relues lors de l'audit du 2026-10-29) ; toute nouvelle doit être relue avant d'entrer dans la liste.
select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
       and p.proname not in (
         'cancel_invoice', 'decide_payment_cancellation', 'issue_invoices', 'mark_conversation_read',
         'publish_announcement', 'record_payment', 'report_card_download_blocked', 'request_payment_cancellation',
         'send_message', 'set_chapter_progress', 'start_conversation', 'start_online_payment', 'student_contacts',
         'student_parent_contacts', 'upcoming_compositions', 'validate_chapter', 'verify_report_card',
         'public_school_site', 'preregistration_levels', 'submit_preregistration', 'enroll_preregistration',
         'save_push_subscription'
       ) $$,
  'aucune fonction à privilèges nouvelle n''est ouverte sans relecture'
);

select * from finish();
rollback;
