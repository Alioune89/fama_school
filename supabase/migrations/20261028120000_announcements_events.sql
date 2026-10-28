-- =============================================================================
-- Lot 6.2 — Annonces ciblées et calendrier des événements.
--
-- Annonces : la direction (fondateur, directeur, censeur, secrétaire) publie pour tous les parents, les parents
-- de certaines classes, les parents en retard de paiement, ou le personnel. Les destinataires sont figés à la
-- publication (announcement_recipients) et prévenus par la cloche ; chacun ne lit que ses annonces, la
-- direction les voit toutes.
-- Calendrier : vacances, examens, réunions, fêtes ; visibles de toute l'école (ou du seul personnel).
-- Codes d'erreur : forbidden, invalidAnnouncement, noClass, noRecipient.
-- =============================================================================

create function private.can_publish(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin()
    or private.has_role(p_school_id, array['owner', 'director', 'censor', 'secretary']::public.app_role[]);
$$;
revoke all on function private.can_publish(uuid) from public, anon;
grant execute on function private.can_publish(uuid) to authenticated;

-- Un compte donné a-t-il l'un de ces rôles dans l'école ? (private.has_role regarde le compte connecté.)
create function private.has_role_for(p_user_id uuid, p_school_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.school_memberships m
    where m.user_id = p_user_id and m.school_id = p_school_id and m.role = any (p_roles) and m.status = 'active'
  );
$$;
revoke all on function private.has_role_for(uuid, uuid, public.app_role[]) from public, anon, authenticated;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  audience text not null check (audience in ('parents', 'classes', 'overdue', 'staff')),
  class_ids uuid[] not null default '{}',
  recipient_count integer not null default 0,
  published_by uuid default auth.uid() references auth.users (id) on delete set null,
  published_by_name text not null,
  published_at timestamptz not null default now(),
  unique (id, school_id)
);
create index announcements_school_idx on public.announcements (school_id, published_at desc);
comment on table public.announcements is 'Annonces de la direction, avec leurs destinataires figés à la publication.';

create table public.announcement_recipients (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (announcement_id, user_id)
);
create index announcement_recipients_user_idx on public.announcement_recipients (user_id);

alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;
create policy announcements_select on public.announcements for select to authenticated
  using (
    private.can_publish(school_id)
    or exists (
      select 1 from public.announcement_recipients r
      where r.announcement_id = id and r.user_id = (select auth.uid())
    )
  );
create policy announcements_delete on public.announcements for delete to authenticated
  using (private.can_publish(school_id));
create policy announcement_recipients_select on public.announcement_recipients for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.announcements from authenticated, anon;
revoke insert, update, delete on public.announcement_recipients from authenticated, anon;

-- Publie une annonce et prévient ses destinataires. Renvoie { id, recipients }.
create function public.publish_announcement(
  p_school_id uuid,
  p_title text,
  p_body text,
  p_audience text,
  p_class_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid := p_school_id;
  v_id uuid;
  v_users uuid[];
  v_teachers uuid[];
  v_name text;
begin
  if v_school_id is null or not private.can_publish(v_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 3 or char_length(btrim(coalesce(p_body, ''))) < 1
    or p_audience not in ('parents', 'classes', 'overdue', 'staff')
  then
    raise exception 'invalidAnnouncement' using errcode = 'P0001';
  end if;
  if p_audience = 'classes' and (
    cardinality(coalesce(p_class_ids, '{}')) = 0
    or exists (select 1 from unnest(p_class_ids) k where not exists (
      select 1 from public.classes c where c.id = k and c.school_id = v_school_id))
  ) then
    raise exception 'noClass' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct u), '{}') into v_users
  from (
    -- Parents des élèves inscrits cette année (toutes classes, classes choisies ou en retard de paiement).
    select g.user_id as u
    from public.enrollments e
    join public.classes c on c.id = e.class_id and c.school_id = v_school_id
    join public.academic_years y on y.id = c.academic_year_id and y.is_current
    join public.student_guardians sg on sg.student_id = e.student_id
    join public.guardians g on g.id = sg.guardian_id
    where p_audience <> 'staff' and e.status = 'active' and g.user_id is not null
      and (p_audience <> 'classes' or e.class_id = any (p_class_ids))
      and (p_audience <> 'overdue' or exists (
        select 1 from public.invoices i
        where i.student_id = e.student_id and i.cancelled_at is null
          and i.amount_paid < i.total and i.due_on < current_date
      ))
    union
    -- Personnel et enseignants de l'école.
    select m.user_id
    from public.school_memberships m
    where p_audience = 'staff' and m.school_id = v_school_id and m.status = 'active' and m.role <> 'parent'
  ) recipients;
  if cardinality(v_users) = 0 then
    raise exception 'noRecipient' using errcode = 'P0001';
  end if;

  select coalesce(p.full_name, 'Direction') into v_name from public.profiles p where p.id = (select auth.uid());
  insert into public.announcements (school_id, title, body, audience, class_ids, recipient_count, published_by_name)
  values (v_school_id, btrim(p_title), btrim(p_body), p_audience,
          case when p_audience = 'classes' then p_class_ids else '{}' end, cardinality(v_users), coalesce(v_name, 'Direction'))
  returning id into v_id;
  insert into public.announcement_recipients (announcement_id, user_id) select v_id, unnest(v_users);

  -- Chacun est mené à la page « Annonces » de son espace : parents, enseignants, direction.
  if p_audience = 'staff' then
    v_teachers := array(
      select u from unnest(v_users) u
      where not private.has_role_for(u, v_school_id, private.staff_roles())
    );
    perform private.notify(
      v_teachers, v_school_id, 'announcement', jsonb_build_object('title', btrim(p_title), 'from', coalesce(v_name, 'Direction')),
      '/professeur/annonces', 'announcement:' || v_id
    );
    perform private.notify(
      array(select u from unnest(v_users) u where u <> all (v_teachers)), v_school_id, 'announcement',
      jsonb_build_object('title', btrim(p_title), 'from', coalesce(v_name, 'Direction')),
      '/direction/annonces', 'announcement:' || v_id
    );
  else
    perform private.notify(
      v_users, v_school_id, 'announcement', jsonb_build_object('title', btrim(p_title), 'from', coalesce(v_name, 'Direction')),
      '/parent/annonces', 'announcement:' || v_id
    );
  end if;
  return jsonb_build_object('id', v_id, 'recipients', cardinality(v_users));
end;
$$;
revoke all on function public.publish_announcement(uuid, text, text, text, uuid[]) from public, anon;
grant execute on function public.publish_announcement(uuid, text, text, text, uuid[]) to authenticated;

-- Une annonce supprimée disparaît aussi de la cloche.
create function private.unnotify_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.unnotify('announcement:' || old.id);
  return old;
end;
$$;
create trigger announcements_unnotify after delete on public.announcements
  for each row execute function private.unnotify_announcement();

create table public.school_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  kind text not null check (kind in ('holiday', 'exam', 'meeting', 'event')),
  starts_on date not null,
  ends_on date not null,
  description text check (char_length(description) <= 1000),
  staff_only boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 120)
);
create index school_events_school_idx on public.school_events (school_id, starts_on);
comment on table public.school_events is 'Calendrier de l''école : vacances, examens, réunions, fêtes.';

alter table public.school_events enable row level security;
create policy school_events_select on public.school_events for select to authenticated
  using (private.is_platform_admin()
         or private.has_role(school_id, private.staff_roles() || 'teacher'::public.app_role)
         or (not staff_only and private.is_member(school_id)));
create policy school_events_insert on public.school_events for insert to authenticated
  with check (private.can_publish(school_id));
create policy school_events_update on public.school_events for update to authenticated
  using (private.can_publish(school_id)) with check (private.can_publish(school_id));
create policy school_events_delete on public.school_events for delete to authenticated
  using (private.can_publish(school_id));
