-- Key and tempo are a User's preferred playing values, not canonical facts
-- about a Recording. Refuse the no-backfill migration if production data has
-- changed since the read-only preflight.

do $$
begin
  if exists (
    select 1
    from public.recordings
    where key is not null or tempo is not null
  ) then
    raise exception 'Recording key/tempo migration stopped: canonical values require an explicit ownership decision';
  end if;
end
$$;

alter table public.user_recording_data
  add column key text,
  add column tempo text;

alter table public.recordings
  drop column key,
  drop column tempo;

create or replace function public.update_saved_recording(
  p_recording_id uuid,
  p_name text,
  p_kind text,
  p_artist text,
  p_year text,
  p_album text,
  p_duration text,
  p_key text,
  p_tempo text,
  p_musicbrainz_recording_id uuid,
  p_musicbrainz_release_id uuid,
  p_notes text,
  p_rating smallint,
  p_sort_order smallint,
  p_tags text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.user_recording_data
    where user_id = v_user_id and recording_id = p_recording_id
  ) then
    raise exception 'Saved Recording not found';
  end if;
  if p_kind is not null and p_kind not in ('released', 'video_capture') then
    raise exception 'Invalid Recording kind';
  end if;

  update public.recordings set
    name = p_name,
    kind = p_kind,
    artist = p_artist,
    year = p_year,
    album = p_album,
    duration = p_duration,
    musicbrainz_recording_id = p_musicbrainz_recording_id,
    musicbrainz_release_id = p_musicbrainz_release_id
  where id = p_recording_id;

  update public.user_recording_data set
    notes = p_notes,
    rating = p_rating,
    sort_order = p_sort_order,
    tags = p_tags,
    key = p_key,
    tempo = p_tempo
  where user_id = v_user_id and recording_id = p_recording_id;
end
$$;

comment on table public.user_recording_data is
  'A User saved a Recording; payload, including preferred key and practice tempo, is private to that User.';
