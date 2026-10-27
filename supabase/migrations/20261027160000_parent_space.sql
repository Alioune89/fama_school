-- =============================================================================
-- Lot 5 — Espace parents : prochaines compositions des enfants, consentements à la première connexion.
--
-- Une composition n'est visible des parents qu'une fois ses notes publiées (Lot 3) ; upcoming_compositions
-- leur annonce seulement la matière, le titre et la date des compositions à venir de leurs enfants.
-- Consentements : traitement des données (indispensable pour utiliser l'espace), photos et géolocalisation
-- (facultatifs), avec la version du texte accepté ; chacun ne voit et ne modifie que les siens.
-- =============================================================================

-- Prochaine composition (dans les 60 jours) de chaque enfant demandé dont l'appelant est parent ou personnel.
-- Renvoie [{ studentId, subject, title, heldOn }].
create function public.upcoming_compositions(p_student_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', next.student_id, 'subject', next.subject, 'title', next.title, 'heldOn', next.held_on
  ) order by next.held_on), '[]'::jsonb)
  from (
    select distinct on (en.student_id) en.student_id, su.name as subject, ev.title, ev.held_on
    from public.enrollments en
    join public.classes c on c.id = en.class_id
    join public.academic_years y on y.id = c.academic_year_id and y.is_current
    join public.evaluations ev on ev.class_id = en.class_id and ev.kind = 'composition'
    join public.subjects su on su.id = ev.subject_id
    where en.student_id = any (coalesce(p_student_ids, '{}'))
      and en.status = 'active'
      and ev.held_on between current_date and current_date + 60
      and (private.is_guardian_of(en.student_id) or private.is_staff(en.school_id))
    order by en.student_id, ev.held_on, su.name
  ) next;
$$;

revoke all on function public.upcoming_compositions(uuid[]) from public, anon;
grant execute on function public.upcoming_compositions(uuid[]) to authenticated;

create table public.user_consents (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('data', 'photos', 'location')),
  granted boolean not null,
  -- Version du texte présenté (src/features/consents/texts : CONSENT_VERSION).
  policy_version text not null check (char_length(policy_version) between 1 and 20),
  decided_at timestamptz not null default now(),
  primary key (user_id, kind)
);
comment on table public.user_consents is 'Consentements de chaque compte : données (indispensable), photos, géolocalisation.';

alter table public.user_consents enable row level security;
create policy user_consents_select on public.user_consents for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_consents_insert on public.user_consents for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_consents_update on public.user_consents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke delete on public.user_consents from authenticated, anon;
