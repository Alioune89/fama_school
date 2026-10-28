-- =============================================================================
-- Lot 6.3 — Messagerie entre parents et professeurs ou direction.
--
-- Une conversation relie un parent, au sujet d'un de ses enfants, à un professeur de la classe de l'enfant
-- (teacher_id) ou à la direction (teacher_id null : boîte partagée du fondateur, du directeur, du censeur,
-- de la vie scolaire et du secrétariat). Chacun des deux côtés peut l'ouvrir. Seuls les participants la lisent :
-- la direction ne lit pas les échanges entre un parent et un professeur.
-- Les messages s'écrivent par des fonctions (start_conversation, send_message) ; chaque message prévient l'autre
-- côté par la cloche (une notification par conversation) et est diffusé en temps réel.
-- Horaires des professeurs : jours et heures où ils répondent, affichés aux parents.
-- Codes d'erreur : forbidden, invalidMessage, notTeacherOfStudent, notGuardianOfStudent.
-- =============================================================================

-- Rôles qui partagent la boîte « Direction ».
create function private.inbox_roles()
returns public.app_role[]
language sql
immutable
set search_path = ''
as $$
  select array['owner', 'director', 'censor', 'supervisor', 'secretary']::public.app_role[];
$$;

-- Comptes des professeurs de la classe actuelle d'un élève (matières affectées ou professeur principal).
create function private.student_teacher_users(p_student_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct s.user_id), '{}')
  from public.enrollments e
  join public.classes c on c.id = e.class_id
  join public.academic_years y on y.id = c.academic_year_id and y.is_current
  join public.school_staff s on s.school_id = c.school_id and s.status = 'active' and s.user_id is not null
    and (s.id = c.homeroom_staff_id
         or exists (select 1 from public.teaching_assignments ta where ta.class_id = c.id and ta.staff_id = s.id))
  where e.student_id = p_student_id and e.status = 'active';
$$;
revoke all on function private.student_teacher_users(uuid) from public, anon, authenticated;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null,
  parent_id uuid not null references auth.users (id) on delete cascade,
  -- Professeur ; null : la direction.
  teacher_id uuid references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  -- Noms au moment de l'ouverture (les parents ne lisent pas le répertoire du personnel, et inversement).
  parent_name text not null,
  teacher_name text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index conversations_parent_idx on public.conversations (parent_id, last_message_at desc);
create index conversations_teacher_idx on public.conversations (teacher_id, last_message_at desc);
create index conversations_school_idx on public.conversations (school_id, last_message_at desc) where teacher_id is null;
comment on table public.conversations is 'Conversations entre un parent et un professeur (ou la direction), au sujet d''un enfant.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.staff_availability (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Jours où le professeur répond : 1 = lundi … 7 = dimanche.
  days smallint[] not null default '{1,2,3,4,5}' check (days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  starts_at time not null default '08:00',
  ends_at time not null default '18:00',
  check (ends_at > starts_at)
);
comment on table public.staff_availability is 'Horaires où un professeur répond aux messages des parents.';

-- L'utilisateur connecté participe-t-il à la conversation ?
create function private.in_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.parent_id = (select auth.uid())
           or c.teacher_id = (select auth.uid())
           or (c.teacher_id is null and private.has_role(c.school_id, private.inbox_roles())))
  );
$$;
revoke all on function private.in_conversation(uuid) from public, anon;
grant execute on function private.in_conversation(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.staff_availability enable row level security;

create policy conversations_select on public.conversations for select to authenticated
  using (private.in_conversation(id));
create policy messages_select on public.messages for select to authenticated
  using (private.in_conversation(conversation_id));
create policy conversation_reads_select on public.conversation_reads for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.conversations, public.messages, public.conversation_reads from authenticated, anon;

-- Les horaires d'un professeur sont lisibles par tous les comptes connectés (parents compris).
create policy staff_availability_select on public.staff_availability for select to authenticated using (true);
create policy staff_availability_insert on public.staff_availability for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy staff_availability_update on public.staff_availability for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke delete on public.staff_availability from authenticated, anon;

-- Nom d'un compte : profil, sinon fiche du personnel ou du parent.
create function private.display_name(p_user_id uuid, p_school_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(btrim(p.full_name), '') from public.profiles p where p.id = p_user_id),
    (select s.full_name from public.school_staff s where s.user_id = p_user_id and s.school_id = p_school_id limit 1),
    (select g.full_name from public.guardians g where g.user_id = p_user_id and g.school_id = p_school_id limit 1),
    'Fama School'
  );
$$;
revoke all on function private.display_name(uuid, uuid) from public, anon, authenticated;

-- Écrit un message, marque la conversation lue pour son auteur, prévient l'autre côté.
create function private.post_message(p_conversation public.conversations, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := (select auth.uid());
  v_name text := private.display_name(v_sender, p_conversation.school_id);
  v_params jsonb := jsonb_build_object('from', v_name, 'subject', p_conversation.subject);
  v_key text := 'message:' || p_conversation.id;
  v_inbox uuid[];
begin
  insert into public.messages (conversation_id, sender_id, sender_name, body)
  values (p_conversation.id, v_sender, v_name, btrim(p_body));
  update public.conversations set last_message_at = now() where id = p_conversation.id;
  insert into public.conversation_reads (conversation_id, user_id) values (p_conversation.id, v_sender)
  on conflict (conversation_id, user_id) do update set read_at = now();

  if v_sender is distinct from p_conversation.parent_id then
    perform private.notify(array[p_conversation.parent_id], p_conversation.school_id, 'message', v_params,
      '/parent/messages/' || p_conversation.id, v_key);
  end if;
  if p_conversation.teacher_id is not null then
    if v_sender is distinct from p_conversation.teacher_id then
      perform private.notify(array[p_conversation.teacher_id], p_conversation.school_id, 'message', v_params,
        '/professeur/messages/' || p_conversation.id, v_key);
    end if;
  else
    v_inbox := array_remove(private.role_users(p_conversation.school_id, private.inbox_roles()), v_sender);
    perform private.notify(v_inbox, p_conversation.school_id, 'message', v_params,
      '/direction/messages/' || p_conversation.id, v_key);
  end if;
end;
$$;
revoke all on function private.post_message(public.conversations, text) from public, anon, authenticated;

-- Ouvre une conversation au sujet d'un élève, entre l'un de ses parents et un professeur de sa classe
-- (ou la direction si p_teacher_id est null), avec son premier message. L'appelant est l'un des deux côtés.
create function public.start_conversation(
  p_student_id uuid,
  p_parent_id uuid,
  p_teacher_id uuid,
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_school_id uuid;
  v_conversation public.conversations;
begin
  select s.school_id into v_school_id from public.students s where s.id = p_student_id;
  if v_school_id is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_subject, ''))) < 3 or char_length(btrim(coalesce(p_body, ''))) < 1
    or char_length(btrim(p_body)) > 2000
  then
    raise exception 'invalidMessage' using errcode = 'P0001';
  end if;
  if not (p_parent_id = any (private.guardian_users(p_student_id))) then
    raise exception 'notGuardianOfStudent' using errcode = 'P0001';
  end if;
  if p_teacher_id is not null and not (p_teacher_id = any (private.student_teacher_users(p_student_id))) then
    raise exception 'notTeacherOfStudent' using errcode = 'P0001';
  end if;
  -- L'appelant : le parent, le professeur, ou la direction pour une conversation avec la direction.
  if not (v_me = p_parent_id
          or v_me = p_teacher_id
          or (p_teacher_id is null and private.has_role(v_school_id, private.inbox_roles())))
  then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.conversations (school_id, student_id, parent_id, teacher_id, subject, parent_name, teacher_name)
  values (
    v_school_id, p_student_id, p_parent_id, p_teacher_id, btrim(p_subject),
    coalesce((select g.full_name from public.guardians g where g.user_id = p_parent_id and g.school_id = v_school_id limit 1),
             private.display_name(p_parent_id, v_school_id)),
    case when p_teacher_id is null then null else private.display_name(p_teacher_id, v_school_id) end
  )
  returning * into v_conversation;
  perform private.post_message(v_conversation, p_body);
  return v_conversation.id;
end;
$$;

-- Répond dans une conversation.
create function public.send_message(p_conversation_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  if not private.in_conversation(p_conversation_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 or char_length(btrim(p_body)) > 2000 then
    raise exception 'invalidMessage' using errcode = 'P0001';
  end if;
  select * into v_conversation from public.conversations where id = p_conversation_id for update;
  perform private.post_message(v_conversation, p_body);
end;
$$;

-- Marque une conversation comme lue (et sa notification avec).
create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.in_conversation(p_conversation_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into public.conversation_reads (conversation_id, user_id) values (p_conversation_id, (select auth.uid()))
  on conflict (conversation_id, user_id) do update set read_at = now();
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and dedupe_key = 'message:' || p_conversation_id and read_at is null;
end;
$$;

revoke all on function public.start_conversation(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.send_message(uuid, text) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.start_conversation(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Professeurs d'un élève pour son parent (choix du destinataire) : compte, nom, matières, horaires.
create function public.student_contacts(p_student_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', t.user_id,
    'name', t.full_name,
    'subjects', t.subjects,
    'homeroom', t.homeroom
  ) order by t.homeroom desc, t.full_name), '[]'::jsonb)
  from (
    select s.user_id, s.full_name,
      coalesce(array_agg(distinct su.name) filter (where su.name is not null), '{}') as subjects,
      bool_or(s.id = c.homeroom_staff_id) as homeroom
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    join public.academic_years y on y.id = c.academic_year_id and y.is_current
    join public.school_staff s on s.school_id = c.school_id and s.status = 'active' and s.user_id is not null
    left join public.teaching_assignments ta on ta.class_id = c.id and ta.staff_id = s.id
    left join public.subjects su on su.id = ta.subject_id
    where e.student_id = p_student_id and e.status = 'active'
      and (s.id = c.homeroom_staff_id or ta.id is not null)
      and (private.is_guardian_of(p_student_id) or private.is_staff(c.school_id))
    group by s.user_id, s.full_name
  ) t;
$$;
revoke all on function public.student_contacts(uuid) from public, anon;
grant execute on function public.student_contacts(uuid) to authenticated;

-- Parents d'un élève qui ont un compte (pour leur écrire) : pour ses professeurs et la direction.
create function public.student_parent_contacts(p_student_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', g.user_id, 'name', g.full_name) order by sg.is_primary desc, g.full_name), '[]'::jsonb)
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  join public.students s on s.id = sg.student_id
  where sg.student_id = p_student_id and g.user_id is not null
    and (private.teaches_student(p_student_id) or private.has_role(s.school_id, private.inbox_roles()));
$$;
revoke all on function public.student_parent_contacts(uuid) from public, anon;
grant execute on function public.student_parent_contacts(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
