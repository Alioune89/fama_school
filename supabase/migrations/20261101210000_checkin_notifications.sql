-- Pointage QR : le parent est prévenu de l'arrivée et de la sortie de son enfant (cloche, puis téléphone).
-- Un avis par jour et par sens (premier passage). Un scan enregistré hors ligne et reçu un autre jour ne
-- prévient plus : l'information serait trompeuse.

create function private.notify_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := case tg_table_name when 'student_arrivals' then 'arrival' else 'departure' end;
begin
  -- Dakar est à UTC toute l'année.
  if new.date <> (now() at time zone 'UTC')::date then
    return new;
  end if;
  perform private.notify(
    private.guardian_users(new.student_id), new.school_id, v_kind,
    jsonb_build_object('child', private.first_name(new.student_id), 'at', new.scanned_at),
    '/parent/enfants/' || new.student_id, v_kind || ':' || new.student_id || ':' || new.date
  );
  return new;
end;
$$;
revoke all on function private.notify_checkin() from public, anon, authenticated;

create trigger student_arrivals_notify after insert on public.student_arrivals
  for each row execute function private.notify_checkin();
create trigger student_departures_notify after insert on public.student_departures
  for each row execute function private.notify_checkin();
