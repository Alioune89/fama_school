-- =============================================================================
-- Lot 6.2 (suite) — Annonce à des parents choisis un par un (audience « guardians »).
-- Seuls les parents qui ont déjà un compte (connectés au moins une fois) la reçoivent.
-- =============================================================================

alter table public.announcements drop constraint announcements_audience_check;
alter table public.announcements
  add constraint announcements_audience_check check (audience in ('parents', 'classes', 'overdue', 'staff', 'guardians')),
  add column guardian_ids uuid[] not null default '{}';

drop function public.publish_announcement(uuid, text, text, text, uuid[]);

-- Publie une annonce et prévient ses destinataires. Renvoie { id, recipients }.
create function public.publish_announcement(
  p_school_id uuid,
  p_title text,
  p_body text,
  p_audience text,
  p_class_ids uuid[] default '{}',
  p_guardian_ids uuid[] default '{}'
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
    or p_audience not in ('parents', 'classes', 'overdue', 'staff', 'guardians')
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
  if p_audience = 'guardians' and (
    cardinality(coalesce(p_guardian_ids, '{}')) = 0
    or exists (select 1 from unnest(p_guardian_ids) k where not exists (
      select 1 from public.guardians g where g.id = k and g.school_id = v_school_id))
  ) then
    raise exception 'noGuardian' using errcode = 'P0001';
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
    where p_audience in ('parents', 'classes', 'overdue') and e.status = 'active' and g.user_id is not null
      and (p_audience <> 'classes' or e.class_id = any (p_class_ids))
      and (p_audience <> 'overdue' or exists (
        select 1 from public.invoices i
        where i.student_id = e.student_id and i.cancelled_at is null
          and i.amount_paid < i.total and i.due_on < current_date
      ))
    union
    -- Parents choisis un par un.
    select g.user_id
    from public.guardians g
    where p_audience = 'guardians' and g.school_id = v_school_id and g.id = any (p_guardian_ids) and g.user_id is not null
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
  insert into public.announcements (school_id, title, body, audience, class_ids, guardian_ids, recipient_count, published_by_name)
  values (v_school_id, btrim(p_title), btrim(p_body), p_audience,
          case when p_audience = 'classes' then p_class_ids else '{}' end,
          case when p_audience = 'guardians' then p_guardian_ids else '{}' end,
          cardinality(v_users), coalesce(v_name, 'Direction'))
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
revoke all on function public.publish_announcement(uuid, text, text, text, uuid[], uuid[]) from public, anon;
grant execute on function public.publish_announcement(uuid, text, text, text, uuid[], uuid[]) to authenticated;
