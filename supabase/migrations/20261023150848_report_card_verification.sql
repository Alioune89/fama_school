-- =============================================================================
-- Lot 3.6 — Vérification publique d'un bulletin : /verifier/<code> (QR code imprimé sur le bulletin).
--
-- verify_report_card renvoie les éléments clés du bulletin authentique (école, élève, classe, période,
-- moyenne générale, rang, mention), à comparer avec le papier. Aucun autre détail (notes, absences).
--
-- Limites d'essais, tenues par la base (la fonction est appelable sans compte) :
-- - 20 essais par visiteur et par 10 minutes (clé fournie par l'application : son adresse IP) ;
-- - 300 codes inconnus par minute pour tout le site, contre une recherche massive de codes
--   (10 caractères parmi 32 : environ 10^15 codes possibles).
-- =============================================================================

create table private.verification_attempts (
  id bigint generated always as identity primary key,
  -- Empreinte de la clé du visiteur (jamais l'adresse IP en clair).
  client_hash text not null,
  matched boolean not null,
  attempted_at timestamptz not null default now()
);
create index verification_attempts_client_idx on private.verification_attempts (client_hash, attempted_at);
create index verification_attempts_failed_idx on private.verification_attempts (attempted_at) where not matched;
comment on table private.verification_attempts is 'Essais de vérification de bulletin (limites d''essais), gardés un jour.';

-- Code tel que saisi : « y4qv-wafc a9 » → « Y4QVWAFCA9 ».
create function private.normalize_report_card_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));
$$;

-- Renvoie {"status": "valid", ...} ou {"status": "notFound" | "tooManyAttempts"}.
create function public.verify_report_card(p_code text, p_client text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := private.normalize_report_card_code(p_code);
  v_client text := md5('fama-verify:' || coalesce(nullif(btrim(p_client), ''), 'unknown'));
  v_card public.report_cards;
  v_school text;
begin
  delete from private.verification_attempts where attempted_at < now() - interval '1 day';

  if (select count(*) from private.verification_attempts
      where client_hash = v_client and attempted_at > now() - interval '10 minutes') >= 20
    or (select count(*) from private.verification_attempts
        where not matched and attempted_at > now() - interval '1 minute') >= 300
  then
    return jsonb_build_object('status', 'tooManyAttempts');
  end if;

  if v_code ~ '^[A-Z2-9]{10}$' then
    select * into v_card from public.report_cards r where r.code = v_code;
  end if;
  insert into private.verification_attempts (client_hash, matched) values (v_client, v_card.id is not null);
  if v_card.id is null then
    return jsonb_build_object('status', 'notFound');
  end if;

  select s.name into v_school from public.schools s where s.id = v_card.school_id;
  return jsonb_build_object(
    'status', 'valid',
    'code', v_card.code,
    'school', v_school,
    'generatedAt', v_card.generated_at,
    'student', jsonb_build_object(
      'firstName', v_card.data #>> '{student,firstName}',
      'lastName', v_card.data #>> '{student,lastName}',
      'matricule', v_card.data #>> '{student,matricule}'
    ),
    'className', v_card.data ->> 'className',
    'periodLabel', v_card.data ->> 'periodLabel',
    'academicYear', v_card.data ->> 'academicYear',
    'scale', v_card.data ->> 'scale',
    'general', v_card.data -> 'general',
    'rank', v_card.data -> 'rank',
    'classSize', v_card.data -> 'classSize',
    'mention', case when (v_card.data ->> 'mentionWithheld')::boolean then null else v_card.data -> 'mention' end
  );
end;
$$;

revoke all on function public.verify_report_card(text, text) from public;
grant execute on function public.verify_report_card(text, text) to anon, authenticated;
