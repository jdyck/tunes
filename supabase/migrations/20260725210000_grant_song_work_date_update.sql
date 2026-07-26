-- The work_date_start / work_date_end columns were added to public.songs in
-- 20260725200000 but the column-level UPDATE grant to authenticated (last set
-- in 20260722200000) was never extended to cover them. PostgreSQL raises
-- "permission denied for table songs" when an authenticated User updates a
-- column it lacks privilege on, even where the RLS UPDATE policy permits the
-- row -- which broke saving a Song after a MusicBrainz refresh populated the
-- work dates. Extend the existing column grants to close the gap.

grant update (work_date_start, work_date_end)
  on table public.songs to authenticated;
