-- =============================================================================
-- Lot 6.1 (suite) — Cloche en temps réel : les nouvelles notifications sont diffusées par Supabase Realtime.
-- La RLS de public.notifications s'applique aussi à la diffusion : chacun ne reçoit que les siennes.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table public.notifications;
