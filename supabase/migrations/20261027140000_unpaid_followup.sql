-- =============================================================================
-- Lot 4.5 — Suivi des impayés : relances des familles, blocage facultatif du téléchargement des bulletins.
--
-- Relances : la direction financière note chaque relance (WhatsApp, SMS, appel) avec le montant en retard.
-- Bulletins : si l'école l'a choisi (réglage blockReportCardsWhenOverdue, désactivé par défaut), le parent d'un
-- élève qui a une facture en retard (échéance passée, reste dû) consulte le bulletin à l'écran mais ne le
-- télécharge pas. Le personnel et les enseignants de l'école ne sont jamais bloqués.
-- =============================================================================

create table public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'call')),
  overdue_amount integer not null check (overdue_amount >= 0),
  sent_by uuid default auth.uid() references auth.users (id) on delete set null,
  sent_at timestamptz not null default now(),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index payment_reminders_student_idx on public.payment_reminders (student_id, sent_at desc);
create index payment_reminders_school_idx on public.payment_reminders (school_id, sent_at desc);
comment on table public.payment_reminders is 'Relances des familles pour les factures en retard.';

alter table public.payment_reminders enable row level security;
create policy payment_reminders_select on public.payment_reminders for select to authenticated
  using (private.can_manage_finance(school_id));
create policy payment_reminders_insert on public.payment_reminders for insert to authenticated
  with check (private.can_manage_finance(school_id) and sent_by = (select auth.uid()));
revoke update, delete on public.payment_reminders from authenticated, anon;

-- Le téléchargement de ce bulletin est-il bloqué pour l'utilisateur connecté ?
create function public.report_card_download_blocked(p_report_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select (s.settings ->> 'blockReportCardsWhenOverdue')::boolean is true
      and not private.has_role(r.school_id, private.staff_roles() || 'teacher'::public.app_role)
      and not private.is_platform_admin()
      and exists (
        select 1 from public.invoices i
        where i.student_id = r.student_id and i.cancelled_at is null
          and i.amount_paid < i.total and i.due_on < current_date
      )
    from public.report_cards r
    join public.schools s on s.id = r.school_id
    where r.id = p_report_card_id
  ), false);
$$;

revoke all on function public.report_card_download_blocked(uuid) from public, anon;
grant execute on function public.report_card_download_blocked(uuid) to authenticated;
