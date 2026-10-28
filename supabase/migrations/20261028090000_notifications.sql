-- =============================================================================
-- Lot 6.1 — Centre de notifications (la cloche) et préférences de canal.
--
-- Les notifications sont écrites par la base elle-même (déclencheurs) au fil des événements :
--   parents : notes publiées, bulletin publié, signalement, absence ou retard, facture émise, paiement reçu,
--             décision sur un justificatif ;
--   direction : justificatif reçu (vie scolaire), demande d'annulation d'un paiement (fondateur, directeur).
-- Chaque notification garde un type et ses paramètres (le texte est rédigé par l'application, dans la langue
-- de l'utilisateur) ; une clé évite les doublons (un appel refait, une note republiée) et permet de retirer
-- une notification devenue fausse (élève finalement présent, bulletin dépublié).
-- Préférences : notifications sur le téléphone, SMS, WhatsApp (envoi multicanal au Lot 6.4).
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  kind text not null check (kind ~ '^[a-zA-Z]{2,40}$'),
  params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  link text check (link ~ '^/[^/]'),
  dedupe_key text not null check (char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
comment on table public.notifications is 'Notifications de chaque compte (la cloche), écrites par les déclencheurs de la base.';

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.notifications from authenticated, anon;
-- Seule la date de lecture se modifie.
grant update (read_at) on public.notifications to authenticated;

create table public.notification_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  push boolean not null default true,
  sms boolean not null default false,
  whatsapp boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.notification_settings is 'Canaux choisis par chaque compte en plus de la cloche : téléphone (push), SMS, WhatsApp.';

alter table public.notification_settings enable row level security;
create policy notification_settings_select on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_settings_insert on public.notification_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_settings_update on public.notification_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke delete on public.notification_settings from authenticated, anon;

-- Écrit (ou remet à jour, non lue) une notification pour chaque compte donné.
create function private.notify(
  p_user_ids uuid[],
  p_school_id uuid,
  p_kind text,
  p_params jsonb,
  p_link text,
  p_dedupe_key text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, school_id, kind, params, link, dedupe_key)
  select distinct u, p_school_id, p_kind, p_params, p_link, p_dedupe_key
  from unnest(p_user_ids) as u
  where u is not null
  on conflict (user_id, dedupe_key) do update
    set params = excluded.params, link = excluded.link, created_at = now(), read_at = null;
$$;

-- Comptes des parents d'un élève.
create function private.guardian_users(p_student_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct g.user_id), '{}')
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  where sg.student_id = p_student_id and g.user_id is not null;
$$;

-- Comptes actifs d'une école ayant l'un des rôles donnés.
create function private.role_users(p_school_id uuid, p_roles public.app_role[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct m.user_id), '{}')
  from public.school_memberships m
  where m.school_id = p_school_id and m.role = any (p_roles) and m.status = 'active';
$$;

-- Retire une notification devenue fausse, chez tous ses destinataires.
create function private.unnotify(p_dedupe_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications where dedupe_key = p_dedupe_key;
$$;

revoke all on function private.notify(uuid[], uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function private.guardian_users(uuid) from public, anon, authenticated;
revoke all on function private.role_users(uuid, public.app_role[]) from public, anon, authenticated;
revoke all on function private.unnotify(text) from public, anon, authenticated;

create function private.first_name(p_student_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select first_name from public.students where id = p_student_id;
$$;
revoke all on function private.first_name(uuid) from public, anon, authenticated;

-- Notes publiées : chaque élève noté, chez ses parents.
create function private.notify_evaluation_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grade record;
  v_subject text;
begin
  if new.published_at is null or old.published_at is not null then
    return new;
  end if;
  select name into v_subject from public.subjects where id = new.subject_id;
  for v_grade in select g.student_id from public.grades g where g.evaluation_id = new.id loop
    perform private.notify(
      private.guardian_users(v_grade.student_id), new.school_id, 'gradePublished',
      jsonb_build_object('child', private.first_name(v_grade.student_id), 'title', new.title, 'subject', v_subject),
      '/parent/enfants/' || v_grade.student_id, 'grade:' || new.id || ':' || v_grade.student_id
    );
  end loop;
  return new;
end;
$$;
create trigger evaluations_notify after update of published_at on public.evaluations
  for each row execute function private.notify_evaluation_published();

-- Bulletin publié (ou dépublié : la notification disparaît).
create function private.notify_report_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is not null and old.published_at is null then
    perform private.notify(
      private.guardian_users(new.student_id), new.school_id, 'reportCardPublished',
      jsonb_build_object('child', private.first_name(new.student_id), 'period', new.data ->> 'periodLabel'),
      '/parent/enfants/' || new.student_id || '/bulletins/' || new.id, 'reportCard:' || new.id
    );
  elsif new.published_at is null and old.published_at is not null then
    perform private.unnotify('reportCard:' || new.id);
  end if;
  return new;
end;
$$;
create trigger report_cards_notify after update of published_at on public.report_cards
  for each row execute function private.notify_report_card();

-- Signalement d'un enseignant.
create function private.notify_student_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(
    private.guardian_users(new.student_id), new.school_id, 'studentReport',
    jsonb_build_object('child', private.first_name(new.student_id), 'category', new.category, 'author', new.author_name),
    '/parent/enfants/' || new.student_id, 'report:' || new.id
  );
  return new;
end;
$$;
create trigger student_reports_notify after insert on public.student_reports
  for each row execute function private.notify_student_report();

-- Absence ou retard à l'appel ; finalement présent : la notification disparaît.
create function private.notify_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.attendance_slot;
  v_key text;
begin
  select slot into v_slot from public.attendance_sessions where id = new.session_id;
  v_key := 'attendance:' || new.student_id || ':' || new.date || ':' || v_slot;
  if new.status = 'present' then
    perform private.unnotify(v_key);
  elsif tg_op = 'INSERT' or new.status is distinct from old.status then
    perform private.notify(
      private.guardian_users(new.student_id), new.school_id, 'attendance',
      jsonb_build_object('child', private.first_name(new.student_id), 'status', new.status, 'slot', v_slot, 'date', new.date),
      '/parent/enfants/' || new.student_id, v_key
    );
  end if;
  return new;
end;
$$;
create trigger attendance_records_notify after insert or update of status on public.attendance_records
  for each row execute function private.notify_attendance();

-- Facture émise ; annulée : la notification disparaît.
create function private.notify_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      private.guardian_users(new.student_id), new.school_id, 'invoiceIssued',
      jsonb_build_object('child', private.first_name(new.student_id), 'label', new.label, 'total', new.total, 'dueOn', new.due_on),
      '/parent/paiements', 'invoice:' || new.id
    );
  elsif new.cancelled_at is not null and old.cancelled_at is null then
    perform private.unnotify('invoice:' || new.id);
  end if;
  return new;
end;
$$;
create trigger invoices_notify after insert or update of cancelled_at on public.invoices
  for each row execute function private.notify_invoice();

-- Paiement reçu (parents) ; demande d'annulation (fondateur, directeur).
create function private.notify_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      private.guardian_users(new.student_id), new.school_id, 'paymentReceived',
      jsonb_build_object('child', private.first_name(new.student_id), 'number', new.number, 'amount', new.amount),
      '/parent/paiements', 'payment:' || new.id
    );
  elsif new.status = 'cancel_requested' and old.status = 'valid' then
    perform private.notify(
      array_remove(private.role_users(new.school_id, array['owner', 'director']::public.app_role[]), new.cancel_requested_by),
      new.school_id, 'paymentCancelRequested',
      jsonb_build_object('number', new.number, 'amount', new.amount, 'reason', new.cancel_reason),
      '/direction/finances/encaissements/' || new.id, 'paymentCancel:' || new.id
    );
  elsif old.status = 'cancel_requested' and new.status <> 'cancel_requested' then
    perform private.unnotify('paymentCancel:' || new.id);
  end if;
  return new;
end;
$$;
create trigger payments_notify after insert or update of status on public.payments
  for each row execute function private.notify_payment();

-- Justificatif : reçu (vie scolaire), puis décision (le parent qui l'a envoyé).
create function private.notify_justification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      private.role_users(new.school_id, array['owner', 'director', 'censor', 'supervisor']::public.app_role[]),
      new.school_id, 'justificationReceived',
      jsonb_build_object('child', private.first_name(new.student_id), 'from', new.submitted_by_name),
      '/direction/presences/justificatifs', 'justification:' || new.id
    );
  elsif new.status <> 'pending' and old.status = 'pending' then
    perform private.unnotify('justification:' || new.id);
    perform private.notify(
      array[new.submitted_by], new.school_id, 'justificationReviewed',
      jsonb_build_object('child', private.first_name(new.student_id), 'status', new.status, 'note', new.review_note),
      '/parent/enfants/' || new.student_id, 'justificationReview:' || new.id
    );
  end if;
  return new;
end;
$$;
create trigger absence_justifications_notify after insert or update of status on public.absence_justifications
  for each row execute function private.notify_justification();

-- Les notifications de plus de 90 jours s'effacent (appelée par la tâche quotidienne, ou à la main).
create function public.prune_notifications()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (delete from public.notifications where created_at < now() - interval '90 days' returning 1)
  select count(*)::integer from removed;
$$;
revoke all on function public.prune_notifications() from public, anon, authenticated;
grant execute on function public.prune_notifications() to service_role;
