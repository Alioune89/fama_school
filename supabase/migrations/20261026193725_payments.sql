-- =============================================================================
-- Lot 4.3 — Guichet : encaissements, reçus, annulation en deux temps, dépenses.
--
-- Encaissement (record_payment) : espèces, Wave, Orange Money… réparti sur les factures dues de l'élève,
-- de la plus ancienne échéance à la plus récente (paiements partiels compris) ; reçu numéroté sans trou
-- (R2026-00001) avec un code de vérification (QR code, /verifier/<code>).
-- Annulation : le comptable la demande avec un motif, le fondateur ou le directeur la valide ou la refuse ;
-- la validation vient d'une autre personne que la demande. Un paiement annulé ne compte plus dans les factures.
-- Dépenses : saisie simple par la direction financière.
-- Codes d'erreur : forbidden, unknownStudent, amountExceedsDue, nothingDue, paymentNotValid, reasonRequired,
-- noCancellationRequest, sameValidator.
-- =============================================================================

create type public.payment_method as enum ('cash', 'wave', 'orange_money', 'free_money', 'bank_transfer', 'check', 'online');
create type public.payment_status as enum ('valid', 'cancel_requested', 'cancelled');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  number text not null,
  code text not null unique default private.report_card_code() check (code ~ '^[A-Z2-9]{10}$'),
  method public.payment_method not null,
  amount integer not null check (amount > 0),
  -- Référence de la transaction (Wave, Orange Money, chèque…).
  reference text check (char_length(reference) <= 80),
  note text check (char_length(note) <= 200),
  received_on date not null default current_date,
  received_by uuid default auth.uid() references auth.users (id) on delete set null,
  status public.payment_status not null default 'valid',
  cancel_reason text check (char_length(cancel_reason) between 3 and 200),
  cancel_requested_by uuid references auth.users (id) on delete set null,
  cancel_requested_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, number),
  unique (id, school_id),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete restrict
);
create index payments_school_date_idx on public.payments (school_id, received_on);
create index payments_student_idx on public.payments (student_id);
comment on table public.payments is 'Encaissements des familles ; reçu numéroté, code de vérification, annulation validée par la direction.';

create table public.payment_allocations (
  payment_id uuid not null references public.payments (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  school_id uuid not null,
  amount integer not null check (amount > 0),
  primary key (payment_id, invoice_id)
);
create index payment_allocations_invoice_idx on public.payment_allocations (invoice_id);
comment on table public.payment_allocations is 'Répartition d''un paiement sur les factures de l''élève.';

create type public.expense_category as enum ('salaries', 'rent', 'utilities', 'supplies', 'maintenance', 'transport', 'food', 'other');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  spent_on date not null default current_date,
  category public.expense_category not null,
  label text not null check (char_length(label) between 2 and 120),
  amount integer not null check (amount > 0 and amount <= 100000000),
  method public.payment_method not null default 'cash',
  reference text check (char_length(reference) <= 80),
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_school_date_idx on public.expenses (school_id, spent_on);
comment on table public.expenses is 'Dépenses de l''école (saisie simple).';

alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.expenses enable row level security;

create policy payments_select on public.payments for select to authenticated
  using (private.is_staff(school_id) or private.is_guardian_of(student_id) or private.is_platform_admin());
create policy payment_allocations_select on public.payment_allocations for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id));
revoke insert, update, delete on public.payments, public.payment_allocations from authenticated, anon;

create policy expenses_select on public.expenses for select to authenticated
  using (private.can_manage_finance(school_id));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (private.can_manage_finance(school_id));
create policy expenses_update on public.expenses for update to authenticated
  using (private.can_manage_finance(school_id)) with check (private.can_manage_finance(school_id));
create policy expenses_delete on public.expenses for delete to authenticated
  using (private.can_manage_finance(school_id));

-- Somme payée d'une facture : paiements non annulés (validés ou en attente d'annulation).
create function private.refresh_invoice_paid(p_invoice_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invoices i
  set amount_paid = coalesce((
    select sum(a.amount) from public.payment_allocations a
    join public.payments p on p.id = a.payment_id
    where a.invoice_id = i.id and p.status <> 'cancelled'
  ), 0)
  where i.id = p_invoice_id;
$$;

revoke all on function private.refresh_invoice_paid(uuid) from public, anon, authenticated;

-- Encaisse un montant pour un élève : réparti sur les factures choisies, ou sur toutes ses factures dues,
-- de la plus ancienne échéance à la plus récente. Renvoie l'identifiant du paiement.
create function public.record_payment(
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
  v_year integer;
  v_due integer;
  v_left integer := p_amount;
  v_payment_id uuid;
  v_invoice record;
  v_part integer;
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

  -- Factures dues, verrouillées le temps de l'encaissement.
  create temporary table due_invoices on commit drop as
    select i.id, i.total - i.amount_paid as remaining, i.due_on, i.number
    from public.invoices i
    where i.student_id = p_student_id and i.cancelled_at is null and i.amount_paid < i.total
      and (p_invoice_ids is null or i.id = any (p_invoice_ids));
  perform 1 from public.invoices i where i.id in (select id from due_invoices) for update;

  select coalesce(sum(remaining), 0) into v_due from due_invoices;
  if v_due = 0 then
    raise exception 'nothingDue' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_due then
    raise exception 'amountExceedsDue' using errcode = 'P0001';
  end if;

  v_year := extract(year from current_date)::integer;
  insert into public.payments (school_id, student_id, number, method, amount, reference, note)
  values (
    v_school_id, p_student_id,
    'R' || v_year || '-' || lpad(private.next_sequence(v_school_id, 'receipt', v_year)::text, 5, '0'),
    p_method, p_amount, nullif(btrim(p_reference), ''), nullif(btrim(p_note), '')
  )
  returning id into v_payment_id;

  for v_invoice in select * from due_invoices order by due_on, number loop
    exit when v_left = 0;
    v_part := least(v_left, v_invoice.remaining);
    insert into public.payment_allocations (payment_id, invoice_id, school_id, amount)
    values (v_payment_id, v_invoice.id, v_school_id, v_part);
    perform private.refresh_invoice_paid(v_invoice.id);
    v_left := v_left - v_part;
  end loop;

  drop table due_invoices;
  return v_payment_id;
end;
$$;

revoke all on function public.record_payment(uuid, integer, public.payment_method, text, text, uuid[]) from public, anon;
grant execute on function public.record_payment(uuid, integer, public.payment_method, text, text, uuid[]) to authenticated;

-- Demande d'annulation (comptable, fondateur ou directeur), avec motif.
create function public.request_payment_cancellation(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if v_payment.id is null or not private.can_manage_finance(v_payment.school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'valid' then
    raise exception 'paymentNotValid' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reasonRequired' using errcode = 'P0001';
  end if;
  update public.payments
  set status = 'cancel_requested', cancel_reason = btrim(p_reason),
      cancel_requested_by = (select auth.uid()), cancel_requested_at = now()
  where id = p_payment_id;
end;
$$;

-- Décision du fondateur ou du directeur, autre que l'auteur de la demande : annuler ou garder le paiement.
create function public.decide_payment_cancellation(p_payment_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_invoice_id uuid;
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if v_payment.id is null
    or not (private.is_platform_admin() or private.has_role(v_payment.school_id, array['owner', 'director']::public.app_role[]))
  then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'cancel_requested' then
    raise exception 'noCancellationRequest' using errcode = 'P0001';
  end if;
  if v_payment.cancel_requested_by = (select auth.uid()) then
    raise exception 'sameValidator' using errcode = 'P0001';
  end if;

  if not p_approve then
    update public.payments
    set status = 'valid', cancel_reason = null, cancel_requested_by = null, cancel_requested_at = null
    where id = p_payment_id;
    return;
  end if;

  update public.payments set status = 'cancelled', cancelled_by = (select auth.uid()), cancelled_at = now()
  where id = p_payment_id;
  for v_invoice_id in select a.invoice_id from public.payment_allocations a where a.payment_id = p_payment_id loop
    perform private.refresh_invoice_paid(v_invoice_id);
  end loop;
end;
$$;

revoke all on function public.request_payment_cancellation(uuid, text) from public, anon;
revoke all on function public.decide_payment_cancellation(uuid, boolean) from public, anon;
grant execute on function public.request_payment_cancellation(uuid, text) to authenticated;
grant execute on function public.decide_payment_cancellation(uuid, boolean) to authenticated;

-- Vérification publique : bulletins (Lot 3.6) et désormais reçus, avec les mêmes limites d'essais.
create or replace function public.verify_report_card(p_code text, p_client text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := private.normalize_report_card_code(p_code);
  v_client text := md5('fama-verify:' || coalesce(nullif(btrim(p_client), ''), 'unknown'));
  v_card public.report_cards;
  v_payment public.payments;
  v_school text;
begin
  delete from private.verification_attempts where attempted_at < now() - interval '1 day';

  if (select count(*) from private.verification_attempts
      where client_hash = v_client and attempted_at > now() - interval '10 minutes') >= 20
    or (select count(*) from private.verification_attempts
        where not matched and attempted_at > now() - interval '1 minute') >= 300
  then
    return jsonb_build_object('status', 'tooManyAttempts');
  end if;

  if v_code ~ '^[A-Z2-9]{10}$' then
    select * into v_card from public.report_cards r where r.code = v_code;
    if v_card.id is null then
      select * into v_payment from public.payments p where p.code = v_code;
    end if;
  end if;
  insert into private.verification_attempts (client_hash, matched)
  values (v_client, v_card.id is not null or v_payment.id is not null);

  if v_payment.id is not null then
    select s.name into v_school from public.schools s where s.id = v_payment.school_id;
    return jsonb_build_object(
      'status', 'valid',
      'kind', 'receipt',
      'code', v_payment.code,
      'school', v_school,
      'number', v_payment.number,
      'receivedOn', v_payment.received_on,
      'amount', v_payment.amount,
      'method', v_payment.method,
      'cancelled', v_payment.status = 'cancelled',
      'student', (select jsonb_build_object('firstName', s.first_name, 'lastName', s.last_name, 'matricule', s.matricule)
                  from public.students s where s.id = v_payment.student_id)
    );
  end if;
  if v_card.id is null then
    return jsonb_build_object('status', 'notFound');
  end if;

  select s.name into v_school from public.schools s where s.id = v_card.school_id;
  return jsonb_build_object(
    'status', 'valid',
    'kind', 'reportCard',
    'code', v_card.code,
    'school', v_school,
    'generatedAt', v_card.generated_at,
    'student', jsonb_build_object(
      'firstName', v_card.data #>> '{student,firstName}',
      'lastName', v_card.data #>> '{student,lastName}',
      'matricule', v_card.data #>> '{student,matricule}'
    ),
    'className', v_card.data ->> 'className',
    'periodLabel', v_card.data ->> 'periodLabel',
    'academicYear', v_card.data ->> 'academicYear',
    'scale', v_card.data ->> 'scale',
    'general', v_card.data -> 'general',
    'rank', v_card.data -> 'rank',
    'classSize', v_card.data -> 'classSize',
    'mention', case when (v_card.data ->> 'mentionWithheld')::boolean then null else v_card.data -> 'mention' end
  );
end;
$$;
