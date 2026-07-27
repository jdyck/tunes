alter table public.song_user_data
  add column favorite boolean not null default false,
  add column tags text[];

grant update (favorite, tags)
  on table public.song_user_data to authenticated;

comment on table public.song_user_data is
  'Private per-User Song membership, notes, title override, favorite, tags, and added time.';
