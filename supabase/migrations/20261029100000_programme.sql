-- =============================================================================
-- Lot 7.2 — Programme annuel et progression.
--
-- Programme : par niveau et matière (commun aux classes du niveau), une liste ordonnée de chapitres avec le
-- nombre de séances prévues et le mois visé. Rédigé par la direction pédagogique ou les professeurs de la
-- matière dans le niveau.
-- Progression, classe par classe : le professeur marque un chapitre « en cours » puis « terminé » ; la
-- direction pédagogique (fondateur, directeur, censeur) le valide, ou le renvoie « en cours ». Un chapitre
-- terminé prévient la direction par la cloche. Les parents voient la progression de la classe de leur enfant.
-- Codes d'erreur : forbidden, invalidStatus, notDone.
-- =============================================================================

create table public.programme_chapters (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  level_id uuid not null,
  subject_id uuid not null,
  position smallint not null default 0,
  title text not null check (char_length(title) between 2 and 160),
  sessions smallint not null default 1 check (sessions between 1 and 60),
  -- Premier jour du mois où le chapitre devrait être terminé ; null : pas d'échéance.
  target_month date check (target_month is null or extract(day from target_month) = 1),
  created_at timestamptz not null default now(),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (level_id, school_id) references public.levels (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade
);
create index programme_chapters_idx on public.programme_chapters (level_id, subject_id, academic_year_id, position);
comment on table public.programme_chapters is 'Programme annuel : chapitres par niveau et matière, séances prévues, mois visé.';

create table public.chapter_progress (
  class_id uuid not null,
  chapter_id uuid not null references public.programme_chapters (id) on delete cascade,
  school_id uuid not null,
  status text not null check (status in ('in_progress', 'done', 'validated')),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz,
  primary key (class_id, chapter_id),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade
);
comment on table public.chapter_progress is 'Avancement d''une classe dans le programme : en cours, terminé (à valider), validé.';

-- Le compte connecté peut-il rédiger le programme de ce niveau dans cette matière ?
create function private.can_edit_programme(p_level_id uuid, p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.levels l where l.id = p_level_id and private.can_manage_academics(l.school_id)
  ) or exists (
    select 1
    from public.classes c
    join public.academic_years y on y.id = c.academic_year_id and y.is_current
    where c.level_id = p_level_id and private.can_grade(c.id, p_subject_id)
  );
$$;
revoke all on function private.can_edit_programme(uuid, uuid) from public, anon;
grant execute on function private.can_edit_programme(uuid, uuid) to authenticated;

alter table public.programme_chapters enable row level security;
alter table public.chapter_progress enable row level security;

create policy programme_chapters_select on public.programme_chapters for select to authenticated
  using (private.is_member(school_id) or private.is_platform_admin());
create policy programme_chapters_insert on public.programme_chapters for insert to authenticated
  with check (private.can_edit_programme(level_id, subject_id));
create policy programme_chapters_update on public.programme_chapters for update to authenticated
  using (private.can_edit_programme(level_id, subject_id)) with check (private.can_edit_programme(level_id, subject_id));
create policy programme_chapters_delete on public.programme_chapters for delete to authenticated
  using (private.can_edit_programme(level_id, subject_id));

create policy chapter_progress_select on public.chapter_progress for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_guardian_in_class(class_id)
         or private.is_platform_admin());
revoke insert, update, delete on public.chapter_progress from authenticated, anon;

-- Le professeur de la classe dans la matière du chapitre : « en cours », « terminé », ou retour à faire (null).
-- Un chapitre validé ne se modifie plus que par la direction pédagogique.
create function public.set_chapter_progress(p_class_id uuid, p_chapter_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter public.programme_chapters;
  v_class public.classes;
  v_current text;
  v_academics boolean;
begin
  select * into v_chapter from public.programme_chapters where id = p_chapter_id;
  select * into v_class from public.classes where id = p_class_id;
  if v_chapter.id is null or v_class.id is null or v_class.level_id <> v_chapter.level_id
    or not private.can_grade(p_class_id, v_chapter.subject_id)
  then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_status is not null and p_status not in ('in_progress', 'done') then
    raise exception 'invalidStatus' using errcode = 'P0001';
  end if;
  v_academics := private.can_manage_academics(v_class.school_id);
  select status into v_current from public.chapter_progress where class_id = p_class_id and chapter_id = p_chapter_id;
  if v_current = 'validated' and not v_academics then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_status is null then
    delete from public.chapter_progress where class_id = p_class_id and chapter_id = p_chapter_id;
  else
    insert into public.chapter_progress (class_id, chapter_id, school_id, status)
    values (p_class_id, p_chapter_id, v_class.school_id, p_status)
    on conflict (class_id, chapter_id) do update
      set status = excluded.status, updated_by = (select auth.uid()), updated_at = now(),
          validated_by = null, validated_at = null;
  end if;

  if p_status = 'done' then
    perform private.notify(
      array_remove(private.role_users(v_class.school_id, array['owner', 'director', 'censor']::public.app_role[]), (select auth.uid())),
      v_class.school_id, 'chapterDone',
      jsonb_build_object('chapter', v_chapter.title, 'className', v_class.name,
                         'subject', (select name from public.subjects where id = v_chapter.subject_id)),
      '/direction/programme?classe=' || p_class_id, 'chapter:' || p_class_id || ':' || p_chapter_id
    );
  else
    perform private.unnotify('chapter:' || p_class_id || ':' || p_chapter_id);
  end if;
end;
$$;

-- La direction pédagogique valide un chapitre terminé, ou le renvoie « en cours ».
create function public.validate_chapter(p_class_id uuid, p_chapter_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_progress public.chapter_progress;
begin
  select * into v_progress from public.chapter_progress where class_id = p_class_id and chapter_id = p_chapter_id for update;
  if v_progress.class_id is null or not private.can_manage_academics(v_progress.school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_progress.status <> 'done' then
    raise exception 'notDone' using errcode = 'P0001';
  end if;
  update public.chapter_progress
  set status = case when p_approve then 'validated' else 'in_progress' end,
      validated_by = case when p_approve then (select auth.uid()) end,
      validated_at = case when p_approve then now() end
  where class_id = p_class_id and chapter_id = p_chapter_id;
  perform private.unnotify('chapter:' || p_class_id || ':' || p_chapter_id);
end;
$$;

revoke all on function public.set_chapter_progress(uuid, uuid, text) from public, anon;
revoke all on function public.validate_chapter(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_chapter_progress(uuid, uuid, text) to authenticated;
grant execute on function public.validate_chapter(uuid, uuid, boolean) to authenticated;
