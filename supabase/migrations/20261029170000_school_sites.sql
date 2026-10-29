-- =============================================================================
-- Lot 8.1-8.2 — Site vitrine de l'école (/ecoles/<slug>).
--
-- La direction (fondateur, directeur, secrétariat) rédige le site : accroche, présentation, chiffres clés, frais
-- indicatifs, étapes d'admission, FAQ, contacts, couleur d'accent, photos ; elle publie quand c'est prêt.
-- Le public le lit par une seule fonction (public_school_site), qui ne renvoie qu'un site publié, avec le cursus
-- déduit des niveaux de l'école et les événements publics à venir.
-- Photos : stockage public school-sites, rangé <école>/<fichier>.
-- =============================================================================

create table public.school_sites (
  school_id uuid primary key references public.schools (id) on delete cascade,
  published boolean not null default false,
  published_at timestamptz,
  accent_color text not null default '#1570a6' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  tagline text check (char_length(tagline) <= 160),
  about text check (char_length(about) <= 3000),
  admissions text check (char_length(admissions) <= 2000),
  hero_path text check (char_length(hero_path) <= 300),
  -- [{ label, value }] (4 au plus), [{ label, amount }], [{ question, answer }], [chemin…] (12 au plus).
  stats jsonb not null default '[]' check (jsonb_typeof(stats) = 'array' and jsonb_array_length(stats) <= 4),
  fees jsonb not null default '[]' check (jsonb_typeof(fees) = 'array' and jsonb_array_length(fees) <= 20),
  faq jsonb not null default '[]' check (jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 20),
  gallery jsonb not null default '[]' check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 12),
  whatsapp text check (whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  updated_at timestamptz not null default now()
);
comment on table public.school_sites is 'Site vitrine de l''école : contenu rédigé par la direction, publié sur /ecoles/<slug>.';

alter table public.school_sites enable row level security;
create policy school_sites_select on public.school_sites for select to authenticated
  using (private.is_staff(school_id) or private.is_platform_admin());
create policy school_sites_insert on public.school_sites for insert to authenticated
  with check (private.can_publish(school_id));
create policy school_sites_update on public.school_sites for update to authenticated
  using (private.can_publish(school_id)) with check (private.can_publish(school_id));
revoke delete on public.school_sites from authenticated, anon;

-- Site publié d'une école, pour tous (visiteurs compris) ; l'aperçu (p_preview) réservé au personnel de l'école.
create function public.public_school_site(p_slug text, p_preview boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schoolId', s.id,
    'slug', s.slug,
    'name', s.name,
    'city', s.city,
    'address', s.address,
    'phone', s.phone,
    'email', s.email,
    'logoPath', s.logo_path,
    'published', site.published,
    'accentColor', site.accent_color,
    'tagline', site.tagline,
    'about', site.about,
    'admissions', site.admissions,
    'heroPath', site.hero_path,
    'stats', site.stats,
    'fees', site.fees,
    'faq', site.faq,
    'gallery', site.gallery,
    'whatsapp', site.whatsapp,
    'cycles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', cy.label,
        'levels', (select jsonb_agg(l.label order by l.position) from public.levels l where l.cycle_id = cy.id)
      ) order by cy.position)
      from public.cycles cy where cy.school_id = s.id
        and exists (select 1 from public.levels l where l.cycle_id = cy.id)
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'kind', e.kind, 'startsOn', e.starts_on, 'endsOn', e.ends_on)
                       order by e.starts_on)
      from (
        select * from public.school_events e
        where e.school_id = s.id and not e.staff_only and e.ends_on >= current_date
        order by e.starts_on limit 6
      ) e
    ), '[]'::jsonb)
  )
  from public.schools s
  join public.school_sites site on site.school_id = s.id
  where s.slug = p_slug
    and (site.published or (p_preview and private.is_staff(s.id)));
$$;
revoke all on function public.public_school_site(text, boolean) from public;
grant execute on function public.public_school_site(text, boolean) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-sites', 'school-sites', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']);

create policy school_sites_files_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'school-sites' and private.can_publish(private.try_uuid((storage.foldername(name))[1])));
create policy school_sites_files_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'school-sites' and private.can_publish(private.try_uuid((storage.foldername(name))[1])));
