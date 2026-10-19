-- Socle de sécurité : RLS partout, rien pour les visiteurs anonymes.
begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  $$,
  'toutes les tables du schéma public ont la RLS activée'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
  $$,
  'chaque table publique a au moins une politique (sinon elle serait illisible par erreur)'
);

set local role anon;
select throws_ok(
  'select count(*) from public.schools',
  '42501',
  null,
  'un visiteur anonyme ne peut pas lire les écoles'
);
reset role;

select * from finish();
rollback;
