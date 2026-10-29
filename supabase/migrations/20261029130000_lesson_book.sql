-- =============================================================================
-- Lot 7.3a — Cahier de textes et devoirs.
--
-- Après chaque séance, le professeur note ce qui a été fait (classe, matière, date), éventuellement le chapitre
-- du programme travaillé (qui passe alors « en cours » s'il était à faire) et un devoir avec sa date de remise.
-- Les parents voient le cahier de textes de la classe de leur enfant ; un devoir les prévient par la cloche.
-- La direction et les professeurs de la classe le consultent.
-- =============================================================================

create table public.lesson_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  subject_id uuid not null,
  taught_on date not null,
  content text not null check (char_length(content) between 2 and 2000),
  chapter_id uuid references public.programme_chapters (id) on delete set null,
  homework text check (char_length(homework) between 2 and 1000),
  homework_due_on date,
  author_name text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((homework is null) = (homework_due_on is null)),
  check (homework_due_on is null or homework_due_on >= taught_on),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete cascade
);
create index lesson_entries_class_idx on public.lesson_entries (class_id, taught_on desc);
create index lesson_entries_homework_idx on public.lesson_entries (class_id, homework_due_on) where homework_due_on is not null;
comment on table public.lesson_entries is 'Cahier de textes : séances faites et devoirs donnés, par classe et matière.';

alter table public.lesson_entries enable row level security;
create policy lesson_entries_select on public.lesson_entries for select to authenticated
  using (private.is_staff(school_id) or private.teaches_class(class_id) or private.is_guardian_in_class(class_id)
         or private.is_platform_admin());
create policy lesson_entries_insert on public.lesson_entries for insert to authenticated
  with check (private.can_grade(class_id, subject_id) and created_by = (select auth.uid()));
create policy lesson_entries_update on public.lesson_entries for update to authenticated
  using (private.can_grade(class_id, subject_id)) with check (private.can_grade(class_id, subject_id));
create policy lesson_entries_delete on public.lesson_entries for delete to authenticated
  using (private.can_grade(class_id, subject_id));

-- Cohérence : chapitre du niveau de la classe dans la matière ; nom de l'auteur ; chapitre « à faire » mis en cours.
create function private.check_lesson_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.chapter_id is not null and not exists (
    select 1 from public.programme_chapters ch join public.classes c on c.level_id = ch.level_id
    where ch.id = new.chapter_id and c.id = new.class_id and ch.subject_id = new.subject_id
  ) then
    raise exception 'chapterMismatch' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.author_name := private.display_name(new.created_by, new.school_id);
  end if;
  if new.chapter_id is not null then
    insert into public.chapter_progress (class_id, chapter_id, school_id, status)
    values (new.class_id, new.chapter_id, new.school_id, 'in_progress')
    on conflict (class_id, chapter_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger lesson_entries_check before insert or update on public.lesson_entries
  for each row execute function private.check_lesson_entry();

-- Un devoir prévient les parents des élèves de la classe.
create function private.notify_homework()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text;
begin
  if new.homework is null or (tg_op = 'UPDATE' and old.homework is not distinct from new.homework
                               and old.homework_due_on is not distinct from new.homework_due_on) then
    return new;
  end if;
  select name into v_subject from public.subjects where id = new.subject_id;
  perform private.notify(
    (select coalesce(array_agg(distinct g.user_id), '{}')
     from public.enrollments e
     join public.student_guardians sg on sg.student_id = e.student_id
     join public.guardians g on g.id = sg.guardian_id
     where e.class_id = new.class_id and e.status = 'active' and g.user_id is not null),
    new.school_id, 'homework',
    jsonb_build_object('subject', v_subject, 'dueOn', new.homework_due_on, 'homework', left(new.homework, 120)),
    '/parent/devoirs', 'homework:' || new.id
  );
  return new;
end;
$$;
create trigger lesson_entries_notify after insert or update of homework, homework_due_on on public.lesson_entries
  for each row execute function private.notify_homework();

-- Séance supprimée : sa notification de devoir aussi.
create function private.unnotify_homework()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.unnotify('homework:' || old.id);
  return old;
end;
$$;
create trigger lesson_entries_unnotify after delete on public.lesson_entries
  for each row execute function private.unnotify_homework();
