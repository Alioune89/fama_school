-- =============================================================================
-- Lot 6.4 — Envoi des notifications par SMS et WhatsApp.
--
-- Chaque notification de la cloche est mise en file d'envoi pour les canaux choisis par son destinataire
-- (notification_settings : sms, whatsapp ; désactivés par défaut), vers le téléphone de son profil.
-- Pas plus d'un envoi par canal et par notification toutes les 30 minutes (une conversation active ne
-- déclenche pas une rafale de SMS). Le serveur (rôle service) prend les envois en attente
-- (claim_deliveries), les confie au fournisseur et en note l'issue (finish_delivery) : jusqu'à trois essais,
-- de plus en plus espacés.
-- =============================================================================

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null check (channel in ('sms', 'whatsapp')),
  to_address text not null check (to_address ~ '^\+[1-9][0-9]{6,14}$'),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts smallint not null default 0,
  last_error text check (char_length(last_error) <= 300),
  provider_id text check (char_length(provider_id) <= 100),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_deliveries_queue_idx on public.notification_deliveries (next_attempt_at) where status = 'pending';
create index notification_deliveries_user_idx on public.notification_deliveries (user_id, created_at desc);
comment on table public.notification_deliveries is 'File d''envoi des notifications par SMS et WhatsApp, avec leur issue.';

alter table public.notification_deliveries enable row level security;
create policy notification_deliveries_select on public.notification_deliveries for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.notification_deliveries from authenticated, anon;
grant select, insert, update on public.notification_deliveries to service_role;

-- Met une notification (nouvelle ou ravivée) en file pour les canaux choisis par son destinataire.
create function private.enqueue_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_settings public.notification_settings;
  v_channel text;
begin
  -- Ravivée : seulement si elle était lue ou si elle n'a pas été envoyée depuis 30 minutes (voir plus bas).
  if tg_op = 'UPDATE' and new.created_at = old.created_at then
    return new;
  end if;
  select * into v_settings from public.notification_settings where user_id = new.user_id;
  if v_settings.user_id is null or not (v_settings.sms or v_settings.whatsapp) then
    return new;
  end if;
  select phone into v_phone from public.profiles where id = new.user_id;
  if v_phone is null then
    return new;
  end if;
  foreach v_channel in array array['sms', 'whatsapp'] loop
    continue when (v_channel = 'sms' and not v_settings.sms) or (v_channel = 'whatsapp' and not v_settings.whatsapp);
    continue when exists (
      select 1 from public.notification_deliveries d
      where d.notification_id = new.id and d.channel = v_channel and d.created_at > now() - interval '30 minutes'
    );
    insert into public.notification_deliveries (notification_id, user_id, channel, to_address)
    values (new.id, new.user_id, v_channel, v_phone);
  end loop;
  return new;
end;
$$;
create trigger notifications_enqueue_deliveries after insert or update of created_at on public.notifications
  for each row execute function private.enqueue_deliveries();

-- Serveur : prend jusqu'à p_limit envois en attente (sans conflit entre deux traitements simultanés).
create function public.claim_deliveries(p_limit integer default 20)
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
      where status = 'pending' and next_attempt_at <= now()
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
    'kind', n.kind,
    'params', n.params,
    'link', n.link,
    'locale', coalesce(p.locale::text, 'fr')
  )), '[]'::jsonb)
  from claimed c
  join public.notifications n on n.id = c.notification_id
  left join public.profiles p on p.id = c.user_id;
$$;

-- Serveur : issue d'un envoi. Échec : nouvel essai dans 1 puis 5 minutes, abandon au troisième.
create function public.finish_delivery(p_id uuid, p_ok boolean, p_provider_id text default null, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_deliveries
  set status = case when p_ok then 'sent' when attempts >= 3 then 'failed' else 'pending' end,
      sent_at = case when p_ok then now() end,
      provider_id = left(p_provider_id, 100),
      last_error = case when p_ok then null else left(p_error, 300) end,
      next_attempt_at = case when p_ok then next_attempt_at else now() + (case attempts when 1 then 1 else 5 end) * interval '1 minute' end
  where id = p_id and status = 'sending';
$$;

-- Entretien de la file : envois restés « en cours » plus de 10 minutes (serveur arrêté au milieu) remis en
-- attente ; envois en attente depuis plus de 24 heures (envoi fermé entre-temps) abandonnés, pour ne pas
-- prévenir les familles d'événements passés.
create function public.release_stuck_deliveries()
returns integer
language sql
security definer
set search_path = ''
as $$
  with released as (
    update public.notification_deliveries set status = 'pending'
    where status = 'sending' and next_attempt_at < now() - interval '10 minutes'
    returning 1
  ), expired as (
    update public.notification_deliveries set status = 'failed', last_error = 'expired'
    where status = 'pending' and created_at < now() - interval '24 hours'
    returning 1
  )
  select ((select count(*) from released) + (select count(*) from expired))::integer;
$$;

revoke all on function public.claim_deliveries(integer) from public, anon, authenticated;
revoke all on function public.finish_delivery(uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function public.release_stuck_deliveries() from public, anon, authenticated;
grant execute on function public.claim_deliveries(integer) to service_role;
grant execute on function public.finish_delivery(uuid, boolean, text, text) to service_role;
grant execute on function public.release_stuck_deliveries() to service_role;
