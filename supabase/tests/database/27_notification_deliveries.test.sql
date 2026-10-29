-- Envoi par SMS et WhatsApp : canaux choisis, pas de rafale, trois essais, réservé au serveur.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.schools (id, name, slug) values ('3f270000-0000-4000-8000-000000000010', 'École Test D', 'ecole-test-d');
insert into auth.users (id, aud, role, email) values
  ('4f270000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.d@test.local'),
  ('4f270000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'muet.d@test.local');
insert into public.profiles (id, full_name, phone) values
  ('4f270000-0000-4000-8000-000000000011', 'Khady Diallo', '+221770270011'),
  ('4f270000-0000-4000-8000-000000000012', 'Sans choix', '+221770270012')
  on conflict (id) do update set phone = excluded.phone;
insert into public.notification_settings (user_id, push, sms, whatsapp) values
  ('4f270000-0000-4000-8000-000000000011', true, true, true);

-- Une notification pour chacun : seul le compte qui a choisi SMS et WhatsApp est mis en file.
select private.notify(
  array['4f270000-0000-4000-8000-000000000011', '4f270000-0000-4000-8000-000000000012']::uuid[],
  '3f270000-0000-4000-8000-000000000010', 'announcement', '{"title": "Réunion", "from": "Direction"}', '/parent/annonces', 'test:1'
);
select results_eq(
  $$ select channel, to_address from public.notification_deliveries
     where user_id in ('4f270000-0000-4000-8000-000000000011', '4f270000-0000-4000-8000-000000000012') order by channel $$,
  $$ values ('sms'::text, '+221770270011'::text), ('whatsapp', '+221770270011') $$,
  'SMS et WhatsApp pour le parent qui les a choisis, rien pour l''autre (désactivés par défaut)'
);

-- La même notification ravivée aussitôt (nouveau message dans la conversation) : pas de nouvel envoi.
select private.notify(
  array['4f270000-0000-4000-8000-000000000011']::uuid[],
  '3f270000-0000-4000-8000-000000000010', 'announcement', '{"title": "Réunion", "from": "Direction"}', '/parent/annonces', 'test:1'
);
select is(
  (select count(*)::int from public.notification_deliveries where user_id = '4f270000-0000-4000-8000-000000000011'),
  2,
  'pas plus d''un envoi par canal toutes les 30 minutes'
);

-- Le serveur prend les envois, avec le texte à rédiger.
set local role service_role;
create temporary table claimed on commit drop as select public.claim_deliveries(10) as batch;
select ok(
  (select jsonb_array_length(batch) >= 2 from claimed),
  'le serveur prend les envois en attente'
);
select results_eq(
  $$ select distinct d ->> 'kind', d -> 'params' ->> 'title', d ->> 'locale'
     from claimed, jsonb_array_elements(batch) d where d ->> 'to' = '+221770270011' $$,
  $$ values ('announcement'::text, 'Réunion'::text, 'fr'::text) $$,
  'avec le type, les paramètres et la langue du destinataire'
);
select is(
  public.claim_deliveries(10) -> 0 ->> 'to' is distinct from '+221770270011',
  true,
  'un envoi pris n''est pas repris par un second traitement'
);

create temporary table ids on commit drop as
  select (d ->> 'id')::uuid as id, d ->> 'channel' as channel
  from claimed, jsonb_array_elements(batch) d where d ->> 'to' = '+221770270011';
select lives_ok(
  $$ select public.finish_delivery((select id from ids where channel = 'sms'), true, 'SM123') $$,
  'SMS envoyé'
);
select public.finish_delivery((select id from ids where channel = 'whatsapp'), false, null, 'Numéro non joignable');
select results_eq(
  $$ select channel, status, attempts::int from public.notification_deliveries where id in (select id from ids) order by channel $$,
  $$ values ('sms'::text, 'sent'::text, 1), ('whatsapp', 'pending', 1) $$,
  'le SMS est noté envoyé ; le WhatsApp en échec repart en attente pour un nouvel essai'
);
update public.notification_deliveries set attempts = 3, status = 'sending' where id = (select id from ids where channel = 'whatsapp');
select public.finish_delivery((select id from ids where channel = 'whatsapp'), false, null, 'Numéro non joignable');
select is(
  (select status from public.notification_deliveries where id = (select id from ids where channel = 'whatsapp')),
  'failed',
  'au troisième échec, l''envoi est abandonné'
);

-- Un compte connecté ne voit que ses envois et ne prend pas la file.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f270000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is((select count(*)::int from public.notification_deliveries), 2, 'le parent voit ses envois');
select throws_ok($$ select public.claim_deliveries(10) $$, '42501', null, 'seul le serveur traite la file');

select * from finish();
rollback;
