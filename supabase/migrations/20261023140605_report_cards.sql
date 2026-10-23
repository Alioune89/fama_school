-- =============================================================================
-- Lot 3.5 — Bulletins : une copie figée par élève et par période, calculée par l'application
-- (src/features/report-cards) une fois la période verrouillée, puis publiée aux parents.
--
-- Chaque bulletin porte un code de vérification (QR code imprimé) : /verifier/<code> affiche les
-- éléments clés du bulletin authentique (Lot 3.6), pour repérer un bulletin falsifié.
-- La direction pédagogique génère et publie ; le personnel et les enseignants de la classe lisent ;
-- le parent lit les bulletins publiés de son enfant.
-- Codes d'erreur (traduits par l'application) : periodNotLocked, periodMismatch, unknownStudent.
-- =============================================================================

-- Code lisible (sans 0/O ni 1/I) : 10 caractères, environ 50 bits d'aléa.
create function private.report_card_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b.bytes, i) % 32), 1), '' order by i)
  from (select uuid_send(gen_random_uuid()) as bytes) b, generate_series(0, 9) i;
$$;

revoke all on function private.report_card_code() from public, anon;
grant execute on function private.report_card_code() to authenticated;

create table public.report_cards (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  period_id uuid not null,
  student_id uuid not null,
  code text not null unique default private.report_card_code() check (code ~ '^[A-Z2-9]{10}$'),
  -- Contenu du bulletin au moment de sa génération (src/features/report-cards/build.ts, version comprise).
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  generated_at timestamptz not null default now(),
  generated_by uuid default auth.uid() references auth.users (id) on delete set null,
  published_at timestamptz,
  unique (period_id, student_id),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (period_id, school_id) references public.periods (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);
create index report_cards_class_period_idx on public.report_cards (class_id, period_id);
create index report_cards_student_idx on public.report_cards (student_id);
comment on table public.report_cards is 'Bulletins figés par élève et période ; code de vérification imprimé en QR code.';

-- Un bulletin se génère sur une période verrouillée (notes définitives), pour un élève de la classe.
create function private.check_report_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.periods p where p.id = new.period_id and p.locked_at is not null) then
    raise exception 'periodNotLocked' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.periods p join public.classes c on c.academic_year_id = p.academic_year_id
    where p.id = new.period_id and c.id = new.class_id
  ) then
    raise exception 'periodMismatch' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.enrollments e where e.student_id = new.student_id and e.class_id = new.class_id) then
    raise exception 'unknownStudent' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.data is distinct from old.data then
    new.generated_at := now();
    new.generated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger report_cards_check before insert or update of data, class_id, period_id, student_id on public.report_cards
  for each row execute function private.check_report_card();

alter table public.report_cards enable row level security;

create policy report_cards_select on public.report_cards
  for select to authenticated
  using (
    private.is_staff(school_id)
    or private.teaches_class(class_id)
    or (published_at is not null and private.is_guardian_of(student_id))
    or private.is_platform_admin()
  );

create policy report_cards_insert on public.report_cards
  for insert to authenticated
  with check (private.can_manage_academics(school_id));

create policy report_cards_update on public.report_cards
  for update to authenticated
  using (private.can_manage_academics(school_id))
  with check (private.can_manage_academics(school_id));

create policy report_cards_delete on public.report_cards
  for delete to authenticated
  using (private.can_manage_academics(school_id));

-- Une nouvelle génération remplace le contenu et garde le code ; la publication se pose à part.
revoke update on public.report_cards from authenticated;
grant update (data, published_at) on public.report_cards to authenticated;

-- Enregistre les bulletins d'une classe : {"<élève>": {...contenu...}} ; une nouvelle génération garde le code
-- et la publication. Renvoie le nombre de bulletins enregistrés.
create function public.save_report_cards(p_class_id uuid, p_period_id uuid, p_cards jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_count integer;
begin
  select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  if v_school_id is null or not private.can_manage_academics(v_school_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.report_cards (school_id, class_id, period_id, student_id, data)
  select v_school_id, p_class_id, p_period_id, private.try_uuid(c.key), c.value
  from jsonb_each(p_cards) c
  on conflict (period_id, student_id) do update set data = excluded.data;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.save_report_cards(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_report_cards(uuid, uuid, jsonb) to authenticated;
