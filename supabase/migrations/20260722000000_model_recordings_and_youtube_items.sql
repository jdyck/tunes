-- Split shared Recording identity from private saved state, then normalize
-- YouTube provider evidence. This is a coordinated migration: the preflight
-- checks abort before any legacy columns are removed.

-- Repair five deleted Song parents found during the production preflight.
-- Four have exact surviving Song replacements; the fifth is recreated with
-- its original ID so its Ebb Tide Recording is preserved without guessing.
update public.recordings
set song_id = '46825592-f4a2-4caf-a036-7c6910734d05'
where song_id = '037ef770-d20a-45a2-89c4-7b1fb961cf8c'; -- Skylark

update public.recordings
set song_id = 'f1c35327-f149-436a-adab-8abb22009710'
where song_id = 'c1405dd0-a97e-4970-86f8-18ea885ace64'; -- Avalon

update public.recordings
set song_id = '9a21793d-2ff4-49d2-8b80-9d1539bdedb6'
where song_id = '0e721b65-1d5c-4e55-ac77-27eac8e65860'; -- (In My) Solitude

update public.recordings
set song_id = '4de3dd8a-061d-4844-b651-512d5cbf8af1'
where song_id = '667fbe38-e388-4e0c-a6c9-3e1a96a9cc1c'; -- Dedicated to You

insert into public.songs (id, name, user_id)
select
  '3e4bdf3e-d626-48f3-b30d-3bac4050adbf'::uuid,
  'Ebb Tide',
  r.user_id
from public.recordings r
where r.song_id = '3e4bdf3e-d626-48f3-b30d-3bac4050adbf'
order by r.id
limit 1
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1
    from public.recordings r
    left join auth.users u on u.id = r.user_id
    where r.user_id is null or u.id is null
  ) then
    raise exception 'Recording migration stopped: recordings contain null or invalid user_id values';
  end if;

  if exists (
    select 1
    from public.recordings r
    left join public.songs s on s.id = r.song_id
    where r.song_id is null or s.id is null
  ) then
    raise exception 'Recording migration stopped: recordings contain null or orphaned song_id values';
  end if;
end
$$;

create table public.user_recording_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  recording_id uuid not null references public.recordings(id) on delete cascade,
  notes text,
  rating smallint,
  sort_order smallint,
  tags text[],
  primary key (user_id, recording_id)
);

create index user_recording_data_recording_id_idx
  on public.user_recording_data(recording_id);

alter table public.user_recording_data enable row level security;

create policy "Users read their own saved recordings"
  on public.user_recording_data for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users save recordings for themselves"
  on public.user_recording_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own saved recordings"
  on public.user_recording_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own saved recordings"
  on public.user_recording_data for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into public.user_recording_data (
  user_id,
  recording_id,
  notes,
  rating,
  sort_order,
  tags
)
select
  user_id,
  id,
  notes,
  rating,
  "sortOrder",
  tags
from public.recordings;

do $$
begin
  if (select count(*) from public.user_recording_data)
       <> (select count(*) from public.recordings) then
    raise exception 'Recording migration stopped: private-row backfill count mismatch';
  end if;

  if exists (
    select 1
    from public.recordings r
    join public.user_recording_data urd
      on urd.user_id = r.user_id and urd.recording_id = r.id
    where urd.notes is distinct from r.notes
       or urd.rating is distinct from r.rating
       or urd.sort_order is distinct from r."sortOrder"
       or urd.tags is distinct from r.tags
  ) then
    raise exception 'Recording migration stopped: private-row backfill value mismatch';
  end if;
end
$$;

alter table public.recordings
  alter column song_id drop default,
  alter column song_id set not null;

alter table public.recordings
  add constraint recordings_song_id_fkey
  foreign key (song_id) references public.songs(id);

drop policy if exists "Enable insert for authenticated users only" on public.recordings;
drop policy if exists "Enable users to select,insert,update,delete their own data" on public.recordings;
drop policy if exists "Enable users to view their own data only" on public.recordings;

create policy "Owners and saved users read recordings during transition"
  on public.recordings for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.user_recording_data urd
      where urd.recording_id = recordings.id
        and urd.user_id = (select auth.uid())
    )
  );

create policy "Users create transitional recordings for themselves"
  on public.recordings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owners and saved users update recordings during transition"
  on public.recordings for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.user_recording_data urd
      where urd.recording_id = recordings.id
        and urd.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.user_recording_data urd
      where urd.recording_id = recordings.id
        and urd.user_id = (select auth.uid())
    )
  );

create table public.youtube_items (
  video_id text primary key,
  title text not null,
  channel_name text,
  search_category text not null,
  discovery_sources text[] not null,
  ytmusic_artist_id text,
  ytmusic_artist_name text,
  ytmusic_album_id text,
  ytmusic_album_name text,
  duration_seconds integer,
  metadata_fetched_at timestamptz,
  constraint youtube_items_video_id_check
    check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint youtube_items_title_check
    check (length(btrim(title)) > 0),
  constraint youtube_items_search_category_check
    check (search_category in ('song', 'video')),
  constraint youtube_items_discovery_sources_check
    check (
      cardinality(discovery_sources) > 0
      and discovery_sources <@ array[
        'ytmusic_search',
        'youtube_search',
        'manual_url',
        'legacy_recording_url'
      ]::text[]
    ),
  constraint youtube_items_duration_seconds_check
    check (duration_seconds is null or duration_seconds >= 0)
);

create table public.recording_youtube_items (
  recording_id uuid not null
    references public.recordings(id) on delete cascade,
  youtube_video_id text not null
    references public.youtube_items(video_id),
  created_at timestamptz not null default now(),
  primary key (recording_id, youtube_video_id)
);

create index recording_youtube_items_video_id_idx
  on public.recording_youtube_items(youtube_video_id);

alter table public.youtube_items enable row level security;
alter table public.recording_youtube_items enable row level security;

create policy "Authenticated users read YouTube items"
  on public.youtube_items for select to authenticated using (true);

create policy "Authenticated users read Recording YouTube associations"
  on public.recording_youtube_items for select to authenticated using (true);

create or replace function public.youtube_video_id(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select coalesce(
    case
      when btrim(input) ~ '^[A-Za-z0-9_-]{11}$' then btrim(input)
    end,
    substring(
      input from '(?i)(?:youtube(?:-nocookie)?[.]com/(?:watch[?][^# ]*v=|embed/|v/|shorts/)|youtu[.]be/)([A-Za-z0-9_-]{11})'
    )
  )
$$;

revoke all on function public.youtube_video_id(text) from public;

do $$
begin
  if exists (
    select 1
    from public.recordings
    where nullif(btrim(url), '') is not null
      and public.youtube_video_id(url) is null
  ) then
    raise exception 'YouTube migration stopped: recordings contain unsupported legacy URLs';
  end if;
end
$$;

with legacy_items as (
  select distinct on (public.youtube_video_id(url))
    public.youtube_video_id(url) as video_id,
    coalesce(nullif(btrim(name), ''), 'YouTube video ' || public.youtube_video_id(url)) as title
  from public.recordings
  where nullif(btrim(url), '') is not null
  order by public.youtube_video_id(url), id
)
insert into public.youtube_items (
  video_id,
  title,
  search_category,
  discovery_sources
)
select
  video_id,
  title,
  'video',
  array['legacy_recording_url']::text[]
from legacy_items;

insert into public.recording_youtube_items (recording_id, youtube_video_id)
select id, public.youtube_video_id(url)
from public.recordings
where nullif(btrim(url), '') is not null;

-- Keep the still-deployed combined-row client compatible until the new app is
-- live. This database-side dual write is removed with the legacy columns in a
-- later contraction migration.
create or replace function public.sync_legacy_recording_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_video_id text;
begin
  if current_setting('standards.skip_legacy_recording_trigger', true) = 'on' then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'Legacy Recording owner must match current User';
  end if;

  if new.user_id is not null then
    insert into public.user_recording_data (
      user_id,
      recording_id,
      notes,
      rating,
      sort_order,
      tags
    ) values (
      new.user_id,
      new.id,
      new.notes,
      new.rating,
      new."sortOrder",
      new.tags
    )
    on conflict (user_id, recording_id) do update set
      notes = excluded.notes,
      rating = excluded.rating,
      sort_order = excluded.sort_order,
      tags = excluded.tags;
  end if;

  v_video_id := public.youtube_video_id(new.url);
  if v_video_id is not null then
    insert into public.youtube_items (
      video_id,
      title,
      search_category,
      discovery_sources
    ) values (
      v_video_id,
      coalesce(nullif(btrim(new.name), ''), 'YouTube video ' || v_video_id),
      'video',
      array['legacy_recording_url']::text[]
    )
    on conflict (video_id) do update set
      discovery_sources = (
        select array_agg(source order by source)
        from (
          select distinct unnest(
            youtube_items.discovery_sources || excluded.discovery_sources
          ) as source
        ) sources
      );

    insert into public.recording_youtube_items (
      recording_id,
      youtube_video_id
    ) values (new.id, v_video_id)
    on conflict (recording_id, youtube_video_id) do nothing;
  end if;

  return new;
end
$$;

revoke all on function public.sync_legacy_recording_write() from public;

create trigger sync_legacy_recording_write
after insert or update of user_id, notes, rating, "sortOrder", tags, url
on public.recordings
for each row execute function public.sync_legacy_recording_write();

create or replace function public.clear_legacy_recording_owner_on_unsave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'standards.skip_legacy_recording_trigger',
    'on',
    true
  );

  update public.recordings set
    user_id = null,
    notes = null,
    rating = null,
    "sortOrder" = null,
    tags = null
  where id = old.recording_id
    and user_id = old.user_id;
  return old;
end
$$;

revoke all on function public.clear_legacy_recording_owner_on_unsave() from public;

create trigger clear_legacy_recording_owner_on_unsave
before delete on public.user_recording_data
for each row execute function public.clear_legacy_recording_owner_on_unsave();

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
    perform pg_catalog.set_config(
      'standards.skip_legacy_recording_trigger',
      'on',
      true
    );

    insert into public.recordings (
      song_id,
      name,
      kind,
      artist,
      duration,
      user_id,
      url
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
      end,
      v_user_id,
      'https://www.youtube.com/watch?v=' || p_video_id
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

revoke all on function public.save_youtube_recording(
  uuid, text, text, text, text, text, text,
  text, text, text, text, integer, timestamptz
) from public;
grant execute on function public.save_youtube_recording(
  uuid, text, text, text, text, text, text,
  text, text, text, text, integer, timestamptz
) to authenticated;

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

  perform pg_catalog.set_config(
    'standards.skip_legacy_recording_trigger',
    'on',
    true
  );

  update public.recordings set
    notes = p_notes,
    rating = p_rating,
    "sortOrder" = p_sort_order,
    tags = p_tags
  where id = p_recording_id and user_id = v_user_id;
end
$$;

revoke all on function public.update_saved_recording(
  uuid, text, text, text, text, text, text, text, text,
  uuid, uuid, text, smallint, smallint, text[]
) from public;
grant execute on function public.update_saved_recording(
  uuid, text, text, text, text, text, text, text, text,
  uuid, uuid, text, smallint, smallint, text[]
) to authenticated;

comment on table public.recordings is
  'Shared, provider-neutral Song-scoped performances or versions. Legacy user/private/URL columns remain temporarily for deployed-client compatibility.';
comment on table public.user_recording_data is
  'A User saved a Recording; payload is private to that User.';
comment on table public.youtube_items is
  'Normalized durable snapshots of selected YouTube provider items.';
comment on table public.recording_youtube_items is
  'Many-to-many evidence/playback associations between Recordings and YouTube items.';
