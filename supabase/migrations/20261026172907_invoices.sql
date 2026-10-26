-- =============================================================================
-- Lot 4.2 — Factures : une facture par élève et par mois (mensualités), et une facture des frais annuels
-- (inscription, APE, tenue…) par élève et par année, calculées d'après la grille des frais, les options
-- et les réductions (mêmes règles que src/lib/domain/fees.ts).
--
-- L'émission est idempotente : relancer un mois ne recrée pas les factures déjà émises (non annulées).
-- Numérotation continue, sans trou, par école et par année : F2026-00001 (private.next_sequence, migration
-- academics_people).
-- Une facture impayée peut être annulée (motif obligatoire) ; elle peut alors être réémise.
-- Écriture par les fonctions de ce fichier seulement ; lecture par le personnel et les parents de l'élève.
-- Codes d'erreur (traduits par l'application) : forbidden, unknownYear, monthOutsideSchedule,
-- invoiceAlreadyPaid, invoiceCancelled.
-- =============================================================================

-- Jour d'échéance des mensualités (le 5 du mois par défaut).
alter table public.billing_schedules add column due_day smallint not null default 5 check (due_day between 1 and 28);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  student_id uuid not null,
  number text not null,
  -- Mois facturé (premier jour) ; null : frais annuels.
  billing_month date check (billing_month is null or extract(day from billing_month) = 1),
  label text not null,
  issued_on date not null default current_date,
  due_on date not null,
  total integer not null check (total >= 0),
  -- Somme des paiements affectés (Lot 4.3).
  amount_paid integer not null default 0 check (amount_paid >= 0),
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) between 3 and 200),
  issued_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (school_id, number),
  unique (id, school_id),
  check ((cancelled_at is null) = (cancel_reason is null)),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete restrict,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete restrict
);
-- Une facture vivante par élève et par mois, et une facture de frais annuels par élève et par année.
create unique index invoices_one_per_month on public.invoices (student_id, billing_month)
  where billing_month is not null and cancelled_at is null;
create unique index invoices_one_annual on public.invoices (student_id, academic_year_id)
  where billing_month is null and cancelled_at is null;
create index invoices_school_month_idx on public.invoices (school_id, billing_month);
comment on table public.invoices is 'Factures des familles : mensualités et frais annuels, numérotées sans trou.';

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  school_id uuid not null,
  fee_type_id uuid,
  label text not null,
  -- Montant de la grille, réduction en pourcentage, montant dû (arrondi au franc).
  base_amount integer not null check (base_amount >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  amount integer not null check (amount >= 0),
  position smallint not null default 0,
  foreign key (fee_type_id, school_id) references public.fee_types (id, school_id) on delete restrict
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);
comment on table public.invoice_lines is 'Lignes de facture : un frais, son montant de base, la réduction et le montant dû.';

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

create policy invoices_select on public.invoices for select to authenticated
  using (private.is_staff(school_id) or private.is_guardian_of(student_id) or private.is_platform_admin());
create policy invoice_lines_select on public.invoice_lines for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));

revoke insert, update, delete on public.invoices, public.invoice_lines from authenticated, anon;

-- Lignes dues par un élève : frais du niveau de sa classe (annuels ou mensuels), options choisies,
-- réduction sur le frais, sinon réduction sur toutes les mensualités pour un frais mensuel.
create function private.invoice_lines_for(p_year_id uuid, p_student_id uuid, p_level_id uuid, p_monthly boolean)
returns table (fee_type_id uuid, label text, base_amount integer, discount_percent numeric, amount integer, sort_order smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.name, r.amount, d.percent,
         round(r.amount * (100 - d.percent) / 100)::integer, f.position
  from public.fee_rates r
  join public.fee_types f on f.id = r.fee_type_id and f.active
  cross join lateral (
    select coalesce(
      (select sd.percent from public.student_discounts sd
       where sd.academic_year_id = p_year_id and sd.student_id = p_student_id and sd.fee_type_id = f.id),
      case when f.frequency = 'monthly' then
        (select sd.percent from public.student_discounts sd
         where sd.academic_year_id = p_year_id and sd.student_id = p_student_id and sd.fee_type_id is null)
      end,
      0) as percent
  ) d
  where r.academic_year_id = p_year_id and r.level_id = p_level_id and r.amount > 0
    and f.frequency = case when p_monthly then 'monthly'::public.fee_frequency else 'once'::public.fee_frequency end
    and (not f.optional or exists (
      select 1 from public.student_fee_options o
      where o.academic_year_id = p_year_id and o.student_id = p_student_id and o.fee_type_id = f.id))
    and round(r.amount * (100 - d.percent) / 100) > 0;
$$;

revoke all on function private.invoice_lines_for(uuid, uuid, uuid, boolean) from public, anon, authenticated;

-- Émet les factures d'un mois (p_month : premier jour du mois) ou, sans mois, les frais annuels,
-- pour tous les élèves inscrits dans l'année. Renvoie le nombre de factures créées.
create function public.issue_invoices(p_year_id uuid, p_month date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year public.academic_years;
  v_schedule public.billing_schedules;
  v_student record;
  v_total integer;
  v_invoice_id uuid;
  v_count integer := 0;
  v_number_year integer;
  v_label text;
begin
  select * into v_year from public.academic_years y where y.id = p_year_id;
  if v_year.id is null then
    raise exception 'unknownYear' using errcode = 'P0001';
  end if;
  if not private.can_manage_finance(v_year.school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_schedule from public.billing_schedules b where b.academic_year_id = p_year_id;
  if v_schedule.academic_year_id is null then
    v_schedule.installments := 9;
    v_schedule.first_month := date_trunc('month', v_year.starts_on)::date;
    v_schedule.due_day := 5;
  end if;
  if p_month is not null and (
    extract(day from p_month) <> 1
    or p_month < v_schedule.first_month
    or p_month >= (v_schedule.first_month + make_interval(months => v_schedule.installments))::date
  ) then
    raise exception 'monthOutsideSchedule' using errcode = 'P0001';
  end if;

  v_number_year := extract(year from v_year.starts_on)::integer;
  v_label := case
    when p_month is null then 'Frais annuels ' || v_year.label
    else 'Mensualité ' || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
                                  'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from p_month)::int]
         || ' ' || extract(year from p_month)::int
  end;

  for v_student in
    select e.student_id, c.level_id
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    where c.academic_year_id = p_year_id and e.status = 'active'
      and not exists (
        select 1 from public.invoices i
        where i.student_id = e.student_id and i.cancelled_at is null
          and (case when p_month is null
                    then i.billing_month is null and i.academic_year_id = p_year_id
                    else i.billing_month = p_month end)
      )
    order by e.student_id
  loop
    select coalesce(sum(l.amount), 0) into v_total
    from private.invoice_lines_for(p_year_id, v_student.student_id, v_student.level_id, p_month is not null) l;
    continue when v_total = 0;

    insert into public.invoices (school_id, academic_year_id, student_id, number, billing_month, label, due_on, total)
    values (
      v_year.school_id, p_year_id, v_student.student_id,
      'F' || v_number_year || '-' || lpad(private.next_sequence(v_year.school_id, 'invoice', v_number_year)::text, 5, '0'),
      p_month, v_label,
      case when p_month is null then greatest(current_date, v_year.starts_on)
           -- Le jour d'échéance du mois, ou le jour même pour une émission plus tardive (jamais en retard d'office).
           else greatest(p_month + (v_schedule.due_day - 1), current_date) end,
      v_total
    )
    returning id into v_invoice_id;

    insert into public.invoice_lines (invoice_id, school_id, fee_type_id, label, base_amount, discount_percent, amount, position)
    select v_invoice_id, v_year.school_id, l.fee_type_id, l.label, l.base_amount, l.discount_percent, l.amount, l.sort_order
    from private.invoice_lines_for(p_year_id, v_student.student_id, v_student.level_id, p_month is not null) l;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.issue_invoices(uuid, date) from public, anon;
grant execute on function public.issue_invoices(uuid, date) to authenticated;

-- Annule une facture impayée (motif obligatoire) ; elle peut ensuite être réémise.
create function public.cancel_invoice(p_invoice_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
begin
  select * into v_invoice from public.invoices i where i.id = p_invoice_id for update;
  if v_invoice.id is null or not private.can_manage_finance(v_invoice.school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_invoice.cancelled_at is not null then
    raise exception 'invoiceCancelled' using errcode = 'P0001';
  end if;
  if v_invoice.amount_paid > 0 then
    raise exception 'invoiceAlreadyPaid' using errcode = 'P0001';
  end if;
  update public.invoices set cancelled_at = now(), cancel_reason = btrim(p_reason) where id = p_invoice_id;
end;
$$;

revoke all on function public.cancel_invoice(uuid, text) from public, anon;
grant execute on function public.cancel_invoice(uuid, text) to authenticated;
