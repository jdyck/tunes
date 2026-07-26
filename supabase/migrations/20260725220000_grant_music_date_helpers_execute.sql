-- The songs work-date CHECK constraints (songs_work_date_start_shape,
-- songs_work_date_end_shape, songs_work_date_range_check) call these helper
-- functions, and CHECK constraints execute as the calling role. Migration
-- 20260725200000 revoked them from public without granting authenticated, so a
-- direct songs UPDATE from an authenticated User -- unlike the recordings path,
-- which enforces the same constraints inside a security-definer RPC -- failed
-- with "permission denied for function music_date_valid". Grant execute.

grant execute on function
  public.music_date_valid(text),
  public.music_date_lower(text),
  public.music_date_upper(text)
  to authenticated;
