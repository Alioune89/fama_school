-- =============================================================================
-- Notifications push sur le téléphone (Web Push).
--
-- Chaque navigateur où un compte active « Notifications sur le téléphone » enregistre son abonnement
-- (push_subscriptions). Une notification de la cloche est alors mise en file sur le canal « push » (un envoi par
-- notification, que le serveur distribue à tous les appareils du compte), avec la même règle que SMS et WhatsApp :
-- pas plus d'un envoi toutes les 30 minutes. Le serveur ne prend que les canaux qu'il sait envoyer
-- (claim_deliveries p_channels) : sans clés VAPID, les envois push attendent puis expirent au bout de 24 heures.
-- =============================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
comment on table public.push_subscriptions is 'Appareils abonnés aux notifications push, par compte.';

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon;
revoke insert, update on public.push_subscriptions from authenticated;
grant select, delete on public.push_subscriptions to service_role;

-- Abonne l'appareil au compte connecté ; un téléphone partagé passe au dernier compte qui l'active.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent,
        created_at = now();
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- File d'envoi : canal push, sans adresse (le serveur lit les appareils du compte).
alter table public.notification_deliveries drop constraint notification_deliveries_channel_check;
alter table public.notification_deliveries add constraint notification_deliveries_channel_check
  check (channel in ('sms', 'whatsapp', 'push'));
alter table public.notification_deliveries alter column to_address drop not null;
alter table public.notification_deliveries drop constraint notification_deliveries_to_address_check;
alter table public.notification_deliveries add constraint notification_deliveries_to_address_check
  check (case when channel = 'push' then to_address is null else to_address ~ '^\+[1-9][0-9]{6,14}$' end);

-- Mise en file selon les canaux choisis : push (activé par défaut, s'il y a un appareil abonné), SMS, WhatsApp.
create or replace function private.enqueue_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_settings public.notification_settings;
  v_channel text;
  v_push boolean;
begin
  -- Ravivée : seulement si elle était lue ou si elle n'a pas été envoyée depuis 30 minutes (voir plus bas).
  if tg_op = 'UPDATE' and new.created_at = old.created_at then
    return new;
  end if;
  select * into v_settings from public.notification_settings where user_id = new.user_id;
  v_push := coalesce(v_settings.push, true)
    and exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id);
  if not (v_push or coalesce(v_settings.sms, false) or coalesce(v_settings.whatsapp, false)) then
    return new;
  end if;
  select phone into v_phone from public.profiles where id = new.user_id;
  foreach v_channel in array array['push', 'sms', 'whatsapp'] loop
    continue when (v_channel = 'push' and not v_push)
      or (v_channel = 'sms' and not coalesce(v_settings.sms, false))
      or (v_channel = 'whatsapp' and not coalesce(v_settings.whatsapp, false))
      or (v_channel <> 'push' and v_phone is null);
    continue when exists (
      select 1 from public.notification_deliveries d
      where d.notification_id = new.id and d.channel = v_channel and d.created_at > now() - interval '30 minutes'
    );
    insert into public.notification_deliveries (notification_id, user_id, channel, to_address)
    values (new.id, new.user_id, v_channel, case when v_channel = 'push' then null else v_phone end);
  end loop;
  return new;
end;
$$;

-- Serveur : prend jusqu'à p_limit envois en attente des canaux qu'il sait envoyer.
drop function public.claim_deliveries(integer);
create function public.claim_deliveries(p_limit integer default 20, p_channels text[] default array['sms', 'whatsapp', 'push'])
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.notification_deliveries d
    set status = 'sending', attempts = d.attempts + 1
    where d.id in (
      select id from public.notification_deliveries
      where status = 'pending' and next_attempt_at <= now() and channel = any (p_channels)
      order by next_attempt_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
    )
    returning d.id, d.channel, d.to_address, d.notification_id, d.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'channel', c.channel,
    'to', c.to_address,
    'userId', c.user_id,
    'kind', n.kind,
    'params', n.params,
    'link', n.link,
    'locale', coalesce(p.locale::text, 'fr')
  )), '[]'::jsonb)
  from claimed c
  join public.notifications n on n.id = c.notification_id
  left join public.profiles p on p.id = c.user_id;
$$;
revoke all on function public.claim_deliveries(integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_deliveries(integer, text[]) to service_role;
