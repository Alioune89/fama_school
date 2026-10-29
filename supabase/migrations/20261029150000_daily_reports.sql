-- =============================================================================
-- Lot 7.3b — Rapport journalier du professeur.
--
-- Un rapport par professeur et par jour : un texte court et/ou une note vocale (2 minutes, 3 Mo au plus),
-- modifiable dans la journée. Seuls son auteur et la direction pédagogique (fondateur, directeur, censeur)
-- le lisent ; la direction en télécharge la compilation hebdomadaire en PDF.
-- Notes vocales : stockage privé daily-reports, rangé <école>/<auteur>/<fichier>.
-- =============================================================================

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null,
  report_date date not null default current_date,
  body text check (char_length(body) between 1 and 2000),
  audio_path text check (char_length(audio_path) <= 300),
  audio_seconds smallint check (audio_seconds between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, author_id, report_date),
  check (body is not null or audio_path is not null)
);
create index daily_reports_school_idx on public.daily_reports (school_id, report_date desc);
comment on table public.daily_reports is 'Rapport journalier des professeurs (texte ou note vocale), lu par la direction pédagogique.';

alter table public.daily_reports enable row level security;
create policy daily_reports_select on public.daily_reports for select to authenticated
  using (author_id = (select auth.uid()) or private.can_manage_academics(school_id));
create policy daily_reports_insert on public.daily_reports for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.has_role(school_id, private.staff_roles() || 'teacher'::public.app_role)
    and report_date = current_date
  );
-- Modifiable dans la journée seulement.
create policy daily_reports_update on public.daily_reports for update to authenticated
  using (author_id = (select auth.uid()) and report_date = current_date)
  with check (author_id = (select auth.uid()) and report_date = current_date);
revoke delete on public.daily_reports from authenticated, anon;

create function private.set_daily_report_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.author_name := private.display_name(new.author_id, new.school_id);
  new.updated_at := now();
  return new;
end;
$$;
create trigger daily_reports_author before insert or update on public.daily_reports
  for each row execute function private.set_daily_report_author();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily-reports', 'daily-reports', false, 3145728,
        array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a']);

create policy daily_reports_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'daily-reports'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or private.can_manage_academics(private.try_uuid((storage.foldername(name))[1]))
    )
  );

create policy daily_reports_files_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'daily-reports'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and private.has_role(private.try_uuid((storage.foldername(name))[1]), private.staff_roles() || 'teacher'::public.app_role)
  );

create policy daily_reports_files_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'daily-reports' and owner_id = (select auth.uid())::text);
