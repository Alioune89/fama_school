-- Notifications push : abonnement par compte, mise en file si un appareil est abonné, canaux choisis par le serveur.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into public.schools (id, name, slug) values ('3f360000-0000-4000-8000-000000000010', 'École Test W', 'ecole-test-w');
insert into auth.users (id, aud, role, email) values
  ('4f360000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'parent.w@test.local'),
  ('4f360000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'autre.w@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f360000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_push_subscription('https://push.example.com/abc', repeat('k', 87), repeat('a', 22), 'Chrome Android') $$,
  'un parent abonne son téléphone'
);
select throws_ok(
  $$ insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example.com/x', repeat('k', 87), repeat('a', 22)) $$,
  '42501', null, 'l''abonnement passe uniquement par la fonction'
);

-- Téléphone partagé : il passe au compte qui l'active en dernier.
select set_config('request.jwt.claims', '{"sub": "4f360000-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select public.save_push_subscription('https://push.example.com/abc', repeat('k', 87), repeat('a', 22));
select is((select count(*)::integer from public.push_subscriptions), 1, 'l''autre compte voit l''appareil qu''il vient d''activer');
select set_config('request.jwt.claims', '{"sub": "4f360000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is((select count(*)::integer from public.push_subscriptions), 0, 'le premier compte ne le voit plus');
select public.save_push_subscription('https://push.example.com/abc', repeat('k', 87), repeat('a', 22));

reset role;
-- Le second compte a désactivé le push : rien pour lui ; le premier (réglage par défaut) reçoit un envoi push.
insert into public.notification_settings (user_id, push, sms, whatsapp) values ('4f360000-0000-4000-8000-000000000012', false, false, false);
select private.notify(
  array['4f360000-0000-4000-8000-000000000011', '4f360000-0000-4000-8000-000000000012']::uuid[],
  '3f360000-0000-4000-8000-000000000010', 'announcement', '{"title": "Réunion", "from": "Direction"}', '/parent/annonces', 'test-push:1'
);
select results_eq(
  $$ select user_id, channel, to_address from public.notification_deliveries
     where user_id in ('4f360000-0000-4000-8000-000000000011', '4f360000-0000-4000-8000-000000000012') $$,
  $$ values ('4f360000-0000-4000-8000-000000000011'::uuid, 'push'::text, null::text) $$,
  'un envoi push pour le compte abonné, sans adresse'
);

set local role service_role;
select public.claim_deliveries(100, array['sms', 'whatsapp']);
select is(
  (select status from public.notification_deliveries where user_id = '4f360000-0000-4000-8000-000000000011'),
  'pending',
  'un serveur sans clés push laisse les envois push en attente'
);
select is(
  (select d ->> 'userId' from jsonb_array_elements(public.claim_deliveries(100, array['push'])) d
   where d ->> 'userId' = '4f360000-0000-4000-8000-000000000011'),
  '4f360000-0000-4000-8000-000000000011',
  'le serveur prend l''envoi push avec le compte destinataire'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "4f360000-0000-4000-8000-000000000011", "role": "authenticated"}', true);
delete from public.push_subscriptions where endpoint = 'https://push.example.com/abc';
select is((select count(*)::integer from public.push_subscriptions), 0, 'le parent désabonne son téléphone');

select * from finish();
rollback;
