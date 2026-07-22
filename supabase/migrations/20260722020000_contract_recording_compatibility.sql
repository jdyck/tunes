-- Remove the combined-row Recording compatibility layer after the normalized
-- client has been deployed and smoke-tested. Abort before dropping columns if
-- any legacy private data or YouTube URL was not mirrored into the new model.

do $$
begin
  if exists (
    select 1
    from public.recordings r
    left join public.user_recording_data urd
      on urd.user_id = r.user_id
     and urd.recording_id = r.id
    where r.user_id is not null
      and (
        urd.recording_id is null
        or urd.notes is distinct from r.notes
        or urd.rating is distinct from r.rating
        or urd.sort_order is distinct from r."sortOrder"
        or urd.tags is distinct from r.tags
      )
  ) then
    raise exception 'Recording contraction stopped: legacy private data was not fully mirrored';
  end if;

  if exists (
    select 1
    from public.recordings r
    where r.user_id is null
      and (
        r.notes is not null
        or r.rating is not null
        or r."sortOrder" is not null
        or r.tags is not null
      )
  ) then
    raise exception 'Recording contraction stopped: ownerless legacy private data remains';
  end if;

  if exists (
    select 1
    from public.recordings r
    where nullif(btrim(r.url), '') is not null
      and (
        public.youtube_video_id(r.url) is null
        or not exists (
          select 1
          from public.recording_youtube_items ryi
          where ryi.recording_id = r.id
            and ryi.youtube_video_id = public.youtube_video_id(r.url)
        )
      )
  ) then
    raise exception 'Recording contraction stopped: legacy YouTube URLs were not fully normalized';
  end if;
end
$$;

drop policy if exists "Owners and saved users read recordings during transition"
  on public.recordings;
drop policy if exists "Users create transitional recordings for themselves"
  on public.recordings;
drop policy if exists "Owners and saved users update recordings during transition"
  on public.recordings;

create policy "Authenticated users read recordings"
  on public.recordings for select to authenticated
  using (true);

create policy "Authenticated users create recordings"
  on public.recordings for insert to authenticated
  with check (true);

create policy "Saved users update recordings"
  on public.recordings for update to authenticated
  using (
    exists (
      select 1
      from public.user_recording_data urd
      where urd.recording_id = recordings.id
        and urd.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.user_recording_data urd
      where urd.recording_id = recordings.id
        and urd.user_id = (select auth.uid())
    )
  );

drop trigger if exists sync_legacy_recording_write on public.recordings;
drop function if exists public.sync_legacy_recording_write();

drop trigger if exists clear_legacy_recording_owner_on_unsave
  on public.user_recording_data;
drop function if exists public.clear_legacy_recording_owner_on_unsave();

create or replace function public.save_youtube_recording(
  p_song_id uuid,
  p_video_id text,
  p_title text,
  p_channel_name text,
  p_search_category text,
  p_discovery_source text,
  p_recording_kind text,
  p_ytmusic_artist_id text default null,
  p_ytmusic_artist_name text default null,
  p_ytmusic_album_id text default null,
  p_ytmusic_album_name text default null,
  p_duration_seconds integer default null,
  p_metadata_fetched_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_recording_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1
    from public.songs
    where id = p_song_id and user_id = v_user_id
  ) then
    raise exception 'Song not found for current User';
  end if;
  if p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'Invalid YouTube video ID';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'YouTube title is required';
  end if;
  if p_search_category not in ('song', 'video') then
    raise exception 'Invalid YouTube search category';
  end if;
  if p_discovery_source not in ('ytmusic_search', 'youtube_search', 'manual_url') then
    raise exception 'Invalid YouTube discovery source';
  end if;
  if p_recording_kind not in ('released', 'video_capture') then
    raise exception 'Invalid Recording kind';
  end if;
  if p_duration_seconds is not null and p_duration_seconds < 0 then
    raise exception 'Invalid duration';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_song_id::text || ':' || p_video_id, 0)
  );

  insert into public.youtube_items (
    video_id,
    title,
    channel_name,
    search_category,
    discovery_sources,
    ytmusic_artist_id,
    ytmusic_artist_name,
    ytmusic_album_id,
    ytmusic_album_name,
    duration_seconds,
    metadata_fetched_at
  ) values (
    p_video_id,
    btrim(p_title),
    nullif(btrim(p_channel_name), ''),
    p_search_category,
    array[p_discovery_source]::text[],
    nullif(btrim(p_ytmusic_artist_id), ''),
    nullif(btrim(p_ytmusic_artist_name), ''),
    nullif(btrim(p_ytmusic_album_id), ''),
    nullif(btrim(p_ytmusic_album_name), ''),
    p_duration_seconds,
    p_metadata_fetched_at
  )
  on conflict (video_id) do update set
    title = case
      when excluded.title = 'YouTube video ' || excluded.video_id
        and youtube_items.title <> 'YouTube video ' || youtube_items.video_id
        then youtube_items.title
      when nullif(btrim(excluded.title), '') is not null then excluded.title
      else youtube_items.title
    end,
    channel_name = coalesce(excluded.channel_name, youtube_items.channel_name),
    search_category = case
      when youtube_items.search_category = 'song' or excluded.search_category = 'song'
        then 'song'
      else 'video'
    end,
    discovery_sources = (
      select array_agg(source order by source)
      from (
        select distinct unnest(
          youtube_items.discovery_sources || excluded.discovery_sources
        ) as source
      ) sources
    ),
    ytmusic_artist_id = coalesce(excluded.ytmusic_artist_id, youtube_items.ytmusic_artist_id),
    ytmusic_artist_name = coalesce(excluded.ytmusic_artist_name, youtube_items.ytmusic_artist_name),
    ytmusic_album_id = coalesce(excluded.ytmusic_album_id, youtube_items.ytmusic_album_id),
    ytmusic_album_name = coalesce(excluded.ytmusic_album_name, youtube_items.ytmusic_album_name),
    duration_seconds = coalesce(excluded.duration_seconds, youtube_items.duration_seconds),
    metadata_fetched_at = case
      when excluded.metadata_fetched_at is null then youtube_items.metadata_fetched_at
      when youtube_items.metadata_fetched_at is null then excluded.metadata_fetched_at
      else greatest(youtube_items.metadata_fetched_at, excluded.metadata_fetched_at)
    end;

  select r.id
  into v_recording_id
  from public.recordings r
  join public.recording_youtube_items ryi on ryi.recording_id = r.id
  where r.song_id = p_song_id
    and ryi.youtube_video_id = p_video_id
  order by ryi.created_at, r.id
  limit 1;

  if v_recording_id is null then
    insert into public.recordings (
      song_id,
      name,
      kind,
      artist,
      duration
    ) values (
      p_song_id,
      btrim(p_title),
      p_recording_kind,
      coalesce(
        nullif(btrim(p_ytmusic_artist_name), ''),
        regexp_replace(nullif(btrim(p_channel_name), ''), ' - Topic$', '')
      ),
      case
        when p_duration_seconds is null then null
        else (p_duration_seconds / 60)::text || ':' || lpad((p_duration_seconds % 60)::text, 2, '0')
      end
    )
    returning id into v_recording_id;

    insert into public.recording_youtube_items (recording_id, youtube_video_id)
    values (v_recording_id, p_video_id);
  end if;

  insert into public.user_recording_data (user_id, recording_id)
  values (v_user_id, v_recording_id)
  on conflict (user_id, recording_id) do nothing;

  return v_recording_id;
end
$$;

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
    key = p_key,
    tempo = p_tempo,
    musicbrainz_recording_id = p_musicbrainz_recording_id,
    musicbrainz_release_id = p_musicbrainz_release_id
  where id = p_recording_id;

  update public.user_recording_data set
    notes = p_notes,
    rating = p_rating,
    sort_order = p_sort_order,
    tags = p_tags
  where user_id = v_user_id and recording_id = p_recording_id;
end
$$;

alter table public.recordings
  drop column user_id,
  drop column notes,
  drop column rating,
  drop column "sortOrder",
  drop column tags,
  drop column url;

comment on table public.recordings is
  'Shared, provider-neutral Song-scoped performances or versions.';
