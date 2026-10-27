-- =============================================================================
-- Lot 4.4 — Paiement en ligne par le parent (fournisseur simulé, puis PayDunya).
--
-- Le parent choisit les factures dues de son enfant (start_online_payment) : un paiement en ligne « en attente »
-- est créé pour leur reste dû. Le serveur ouvre la page de paiement du fournisseur (set_online_payment_checkout),
-- puis, après confirmation auprès du fournisseur (jamais sur la seule foi du navigateur ou de la notification),
-- règle le paiement (settle_online_payment) : un encaissement « en ligne » est enregistré avec son reçu,
-- comme au guichet. Ces deux dernières fonctions ne sont ouvertes qu'au rôle service (serveur).
--
-- L'encaissement est désormais écrit par private.insert_payment, partagé avec le guichet (record_payment).
-- Si une facture a été réglée au guichet entre-temps, l'argent reçu en ligne va aux autres factures dues
-- de l'élève ; un éventuel surplus reste sur le paiement, non réparti.
-- Codes d'erreur : forbidden, unknownStudent, nothingDue, tooManyAttempts, unknownOnlinePayment.
-- =============================================================================

create type public.online_payment_status as enum ('pending', 'succeeded', 'failed', 'cancelled');

create table public.online_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  provider text not null check (provider in ('simulated', 'paydunya')),
  amount integer not null check (amount > 0),
  invoice_ids uuid[] not null check (cardinality(invoice_ids) between 1 and 100),
  status public.online_payment_status not null default 'pending',
  -- Jeton de la facture chez le fournisseur et adresse de sa page de paiement.
  provider_token text unique check (char_length(provider_token) <= 200),
  checkout_url text check (char_length(checkout_url) <= 500),
  failure_reason text check (char_length(failure_reason) <= 200),
  payment_id uuid references public.payments (id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index online_payments_student_idx on public.online_payments (student_id, created_at desc);
create index online_payments_creator_idx on public.online_payments (created_by, created_at desc);
comment on table public.online_payments is 'Paiements en ligne des parents : en attente, réussis (avec leur encaissement) ou échoués.';

alter table public.online_payments enable row level security;
create policy online_payments_select on public.online_payments for select to authenticated
  using (created_by = (select auth.uid()) or private.can_manage_finance(school_id) or private.is_platform_admin());
revoke insert, update, delete on public.online_payments from authenticated, anon;

-- Écrit un encaissement et le répartit : d'abord sur les factures choisies, puis sur les autres factures dues
-- de l'élève, de la plus ancienne échéance à la plus récente. Les droits sont vérifiés par l'appelant.
create function private.insert_payment(
  p_student_id uuid,
  p_amount integer,
  p_method public.payment_method,
  p_reference text,
  p_note text,
  p_invoice_ids uuid[],
  p_received_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_year integer := extract(year from current_date)::integer;
  v_left integer := p_amount;
  v_payment_id uuid;
  v_invoice record;
  v_part integer;
begin
  select s.school_id into v_school_id from public.students s where s.id = p_student_id;

  insert into public.payments (school_id, student_id, number, method, amount, reference, note, received_by)
  values (
    v_school_id, p_student_id,
    'R' || v_year || '-' || lpad(private.next_sequence(v_school_id, 'receipt', v_year)::text, 5, '0'),
    p_method, p_amount, nullif(btrim(p_reference), ''), nullif(btrim(p_note), ''), p_received_by
  )
  returning id into v_payment_id;

  for v_invoice in
    select i.id, i.total - i.amount_paid as remaining
    from public.invoices i
    where i.student_id = p_student_id and i.cancelled_at is null and i.amount_paid < i.total
    order by (p_invoice_ids is not null and i.id = any (p_invoice_ids)) desc, i.due_on, i.number
    for update
  loop
    exit when v_left = 0;
    v_part := least(v_left, v_invoice.remaining);
    insert into public.payment_allocations (payment_id, invoice_id, school_id, amount)
    values (v_payment_id, v_invoice.id, v_school_id, v_part);
    perform private.refresh_invoice_paid(v_invoice.id);
    v_left := v_left - v_part;
  end loop;

  return v_payment_id;
end;
$$;

revoke all on function private.insert_payment(uuid, integer, public.payment_method, text, text, uuid[], uuid)
  from public, anon, authenticated;

-- Guichet (Lot 4.3), inchangé pour l'appelant : le montant ne dépasse pas le reste dû des factures choisies.
create or replace function public.record_payment(
  p_student_id uuid,
  p_amount integer,
  p_method public.payment_method,
  p_reference text default null,
  p_note text default null,
  p_invoice_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_due integer;
begin
  select s.school_id into v_school_id from public.students s where s.id = p_student_id;
  if v_school_id is null then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;
  if not private.can_manage_finance(v_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_method = 'online' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- Factures dues choisies, verrouillées le temps de l'encaissement.
  perform 1 from public.invoices i
  where i.student_id = p_student_id and i.cancelled_at is null and i.amount_paid < i.total
    and (p_invoice_ids is null or i.id = any (p_invoice_ids))
  for update;
  select coalesce(sum(i.total - i.amount_paid), 0) into v_due
  from public.invoices i
  where i.student_id = p_student_id and i.cancelled_at is null and i.amount_paid < i.total
    and (p_invoice_ids is null or i.id = any (p_invoice_ids));

  if v_due = 0 then
    raise exception 'nothingDue' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_due then
    raise exception 'amountExceedsDue' using errcode = 'P0001';
  end if;

  return private.insert_payment(
    p_student_id, p_amount, p_method, p_reference, p_note,
    coalesce(p_invoice_ids, (select array_agg(i.id) from public.invoices i where i.student_id = p_student_id)),
    (select auth.uid())
  );
end;
$$;

-- Le parent lance le paiement en ligne des factures dues choisies de son enfant, pour leur reste dû.
-- Renvoie { id, amount, schoolName, studentName }.
create function public.start_online_payment(p_student_id uuid, p_invoice_ids uuid[], p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_ids uuid[];
  v_amount integer;
  v_id uuid;
begin
  select * into v_student from public.students s where s.id = p_student_id;
  if v_student.id is null then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;
  if not private.is_guardian_of(p_student_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_provider is null or p_provider not in ('simulated', 'paydunya') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if (select count(*) from public.online_payments o
      where o.created_by = (select auth.uid()) and o.created_at > now() - interval '1 hour') >= 20
  then
    raise exception 'tooManyAttempts' using errcode = 'P0001';
  end if;

  select array_agg(i.id order by i.due_on, i.number), coalesce(sum(i.total - i.amount_paid), 0)
  into v_ids, v_amount
  from public.invoices i
  where i.student_id = p_student_id and i.cancelled_at is null and i.amount_paid < i.total
    and i.id = any (coalesce(p_invoice_ids, '{}'));
  if coalesce(v_amount, 0) = 0 then
    raise exception 'nothingDue' using errcode = 'P0001';
  end if;

  insert into public.online_payments (school_id, student_id, provider, amount, invoice_ids)
  values (v_student.school_id, p_student_id, p_provider, v_amount, v_ids)
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'amount', v_amount,
    'schoolName', (select s.name from public.schools s where s.id = v_student.school_id),
    'studentName', v_student.first_name || ' ' || v_student.last_name
  );
end;
$$;

revoke all on function public.start_online_payment(uuid, uuid[], text) from public, anon;
grant execute on function public.start_online_payment(uuid, uuid[], text) to authenticated;

-- Serveur seulement : jeton et page de paiement ouverts chez le fournisseur.
create function public.set_online_payment_checkout(p_id uuid, p_token text, p_checkout_url text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.online_payments
  set provider_token = p_token, checkout_url = p_checkout_url
  where id = p_id and status = 'pending';
$$;

-- Serveur seulement, après confirmation auprès du fournisseur : réussite (encaissement « en ligne » et reçu),
-- échec ou abandon. Idempotent : un paiement réussi n'est encaissé qu'une fois. Renvoie l'encaissement.
create function public.settle_online_payment(
  p_id uuid,
  p_status public.online_payment_status,
  p_reference text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_online public.online_payments;
  v_payment_id uuid;
begin
  select * into v_online from public.online_payments o where o.id = p_id for update;
  if v_online.id is null then
    raise exception 'unknownOnlinePayment' using errcode = 'P0001';
  end if;
  if v_online.status = 'succeeded' or p_status = 'pending' then
    return v_online.payment_id;
  end if;

  if p_status <> 'succeeded' then
    update public.online_payments
    set status = p_status, failure_reason = left(nullif(btrim(p_reason), ''), 200), completed_at = now()
    where id = p_id and status = 'pending';
    return null;
  end if;

  -- L'argent est reçu : il est encaissé même si la tentative avait été notée en échec entre-temps.
  v_payment_id := private.insert_payment(
    v_online.student_id, v_online.amount, 'online',
    coalesce(nullif(btrim(p_reference), ''), v_online.provider_token),
    case v_online.provider when 'paydunya' then 'Paiement en ligne PayDunya' else 'Paiement en ligne (démonstration)' end,
    v_online.invoice_ids, v_online.created_by
  );
  update public.online_payments
  set status = 'succeeded', payment_id = v_payment_id, failure_reason = null, completed_at = now()
  where id = p_id;
  return v_payment_id;
end;
$$;

revoke all on function public.set_online_payment_checkout(uuid, text, text) from public, anon, authenticated;
revoke all on function public.settle_online_payment(uuid, public.online_payment_status, text, text)
  from public, anon, authenticated;
grant execute on function public.set_online_payment_checkout(uuid, text, text) to service_role;
grant execute on function public.settle_online_payment(uuid, public.online_payment_status, text, text) to service_role;
grant select on public.online_payments to service_role;
