-- Expand shared Songs away from their legacy owner/private payload while the
-- old deployed client is still compatible. The legacy columns and temporary
-- dual-write/delete policy are removed only after the membership-aware client
-- has been deployed and smoke-tested.

do $$
declare
  v_song_count bigint;
  v_owner_count bigint;
begin
  select count(*), count(distinct user_id)
  into v_song_count, v_owner_count
  from public.songs;

  if exists (select 1 from public.songs where user_id is null) then
    raise exception 'Song split stopped: songs contain null user_id values';
  end if;

  if v_song_count > 0 and v_owner_count <> 1 then
    raise exception
      'Song split stopped: expected exactly one existing Song owner, found %',
      v_owner_count;
  end if;

  if exists (
    select 1
    from public.songs s
    left join auth.users u on u.id = s.user_id
    where u.id is null
  ) then
    raise exception 'Song split stopped: songs contain invalid user_id values';
  end if;

  if exists (
    select 1
    from public.recordings r
    join public.user_recording_data urd on urd.recording_id = r.id
    join public.songs s on s.id = r.song_id
    where urd.user_id <> s.user_id
  ) then
    raise exception
      'Song split stopped: saved Recording ownership conflicts with Song ownership';
  end if;
end
$$;

alter table public.songs
  add column is_discoverable boolean not null default false,
  add column first_discoverable_at timestamptz;

create table public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.song_user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  notes text,
  display_title text,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index song_user_data_song_id_idx
  on public.song_user_data(song_id);

alter table public.site_admins enable row level security;
alter table public.song_user_data enable row level security;

insert into public.site_admins (user_id)
select distinct user_id
from public.songs
where user_id is not null;

insert into public.song_user_data (
  user_id,
  song_id,
  notes,
  display_title,
  created_at
)
select
  user_id,
  id,
  notes,
  null,
  current_timestamp
from public.songs;

update public.songs
set
  is_discoverable = true,
  first_discoverable_at = current_timestamp;

do $$
begin
  if (select count(*) from public.song_user_data)
       <> (select count(*) from public.songs) then
    raise exception 'Song split stopped: private-row backfill count mismatch';
  end if;

  if exists (
    select 1
    from public.songs s
    left join public.song_user_data sud
      on sud.user_id = s.user_id and sud.song_id = s.id
    where sud.song_id is null
      or sud.notes is distinct from s.notes
      or sud.display_title is not null
      or sud.created_at is null
  ) then
    raise exception 'Song split stopped: private-row backfill value mismatch';
  end if;

  if exists (
    select 1
    from public.songs
    where not is_discoverable or first_discoverable_at is null
  ) then
    raise exception 'Song split stopped: existing Songs were not made discoverable';
  end if;
end
$$;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_admins
    where user_id = auth.uid()
  )
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create policy "Users read their own Song data"
  on public.song_user_data for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users update their own Song data"
  on public.song_user_data for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete their own Song data"
  on public.song_user_data for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Enable insert for authenticated users only"
  on public.songs;
drop policy if exists "Enable users to delete their own data"
  on public.songs;
drop policy if exists "Enable users to update their own data"
  on public.songs;
drop policy if exists "Enable users to view their own data only"
  on public.songs;

create policy "Users read visible Songs during transition"
  on public.songs for select to authenticated
  using (
    is_discoverable
    or public.is_site_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1
      from public.song_user_data sud
      where sud.song_id = songs.id
        and sud.user_id = (select auth.uid())
    )
  );

create policy "Legacy clients create hidden Songs during transition"
  on public.songs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not is_discoverable
    and first_discoverable_at is null
  );

create policy "Members edit hidden Songs and admins edit visible Songs"
  on public.songs for update to authenticated
  using (
    public.is_site_admin()
    or (
      not is_discoverable
      and exists (
        select 1
        from public.song_user_data sud
        where sud.song_id = songs.id
          and sud.user_id = (select auth.uid())
      )
    )
  )
  with check (
    public.is_site_admin()
    or (
      not is_discoverable
      and exists (
        select 1
        from public.song_user_data sud
        where sud.song_id = songs.id
          and sud.user_id = (select auth.uid())
      )
    )
  );

-- Removed by the contraction migration. It exists only so the old owner-bound
-- client does not break before the new app is deployed.
create policy "Legacy owners delete Songs during transition"
  on public.songs for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "read song_writers" on public.song_writers;
drop policy if exists "insert song_writers" on public.song_writers;
drop policy if exists "update song_writers" on public.song_writers;
drop policy if exists "delete song_writers" on public.song_writers;

create policy "Users read writers for visible Songs"
  on public.song_writers for select to authenticated
  using (
    exists (
      select 1 from public.songs s where s.id = song_writers.song_id
    )
  );

create policy "Members edit hidden writers and admins edit visible writers"
  on public.song_writers for insert to authenticated
  with check (
    exists (
      select 1
      from public.songs s
      where s.id = song_writers.song_id
        and (
          public.is_site_admin()
          or (
            not s.is_discoverable
            and exists (
              select 1
              from public.song_user_data sud
              where sud.song_id = s.id
                and sud.user_id = (select auth.uid())
            )
          )
        )
    )
  );

create policy "Members update hidden writers and admins update visible writers"
  on public.song_writers for update to authenticated
  using (
    exists (
      select 1
      from public.songs s
      where s.id = song_writers.song_id
        and (
          public.is_site_admin()
          or (
            not s.is_discoverable
            and exists (
              select 1
              from public.song_user_data sud
              where sud.song_id = s.id
                and sud.user_id = (select auth.uid())
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.songs s
      where s.id = song_writers.song_id
        and (
          public.is_site_admin()
          or (
            not s.is_discoverable
            and exists (
              select 1
              from public.song_user_data sud
              where sud.song_id = s.id
                and sud.user_id = (select auth.uid())
            )
          )
        )
    )
  );

create policy "Members delete hidden writers and admins delete visible writers"
  on public.song_writers for delete to authenticated
  using (
    exists (
      select 1
      from public.songs s
      where s.id = song_writers.song_id
        and (
          public.is_site_admin()
          or (
            not s.is_discoverable
            and exists (
              select 1
              from public.song_user_data sud
              where sud.song_id = s.id
                and sud.user_id = (select auth.uid())
            )
          )
        )
    )
  );

create or replace function public.sync_legacy_song_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Legacy Song owner must match current User';
  end if;

  insert into public.song_user_data (
    user_id,
    song_id,
    notes,
    display_title
  ) values (
    new.user_id,
    new.id,
    new.notes,
    null
  )
  on conflict (user_id, song_id) do update set
    notes = excluded.notes;

  return new;
end
$$;

revoke all on function public.sync_legacy_song_write() from public;

create trigger sync_legacy_song_write
after insert or update of user_id, notes
on public.songs
for each row
when (new.user_id is not null)
execute function public.sync_legacy_song_write();

create or replace function public.create_song_with_membership(
  p_song_id uuid,
  p_name text,
  p_year smallint default null,
  p_wikipedia_extract text default null,
  p_wikipedia_url text default null,
  p_musicbrainz_work_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_song_id is null then
    raise exception 'Song request ID is required';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Song name is required';
  end if;

  insert into public.songs (
    id,
    name,
    year,
    wikipedia_extract,
    wikipedia_url,
    musicbrainz_work_id,
    user_id,
    notes,
    is_discoverable,
    first_discoverable_at
  ) values (
    p_song_id,
    btrim(p_name),
    p_year,
    p_wikipedia_extract,
    p_wikipedia_url,
    p_musicbrainz_work_id,
    v_user_id,
    null,
    false,
    null
  )
  on conflict (id) do nothing;

  v_inserted := found;

  if not v_inserted and not exists (
    select 1
    from public.song_user_data
    where user_id = v_user_id and song_id = p_song_id
  ) then
    raise exception 'Song request ID already belongs to another Song';
  end if;

  insert into public.song_user_data (user_id, song_id)
  values (v_user_id, p_song_id)
  on conflict (user_id, song_id) do nothing;

  return p_song_id;
end
$$;

create or replace function public.add_discoverable_song(p_song_id uuid)
returns uuid
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

  perform 1 from public.songs where id = p_song_id for share;

  if exists (
    select 1 from public.song_user_data
    where user_id = v_user_id and song_id = p_song_id
  ) then
    return p_song_id;
  end if;

  if not exists (
    select 1 from public.songs
    where id = p_song_id and is_discoverable
  ) then
    raise exception 'Discoverable Song not found';
  end if;

  insert into public.song_user_data (user_id, song_id)
  values (v_user_id, p_song_id)
  on conflict (user_id, song_id) do nothing;

  return p_song_id;
end
$$;

create or replace function public.set_song_discoverability(
  p_song_id uuid,
  p_is_discoverable boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_site_admin() then
    raise exception 'Site Admin access required';
  end if;

  update public.songs
  set
    is_discoverable = p_is_discoverable,
    first_discoverable_at = case
      when p_is_discoverable then coalesce(first_discoverable_at, now())
      else first_discoverable_at
    end
  where id = p_song_id;

  if not found then
    raise exception 'Song not found';
  end if;
end
$$;

create or replace function public.song_removal_impact(p_song_id uuid)
returns table (
  action text,
  saved_recording_count bigint,
  canonical_recording_count bigint,
  membership_count bigint,
  blocked_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_discoverable boolean;
  v_first_discoverable_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.song_user_data
    where user_id = v_user_id and song_id = p_song_id
  ) then
    raise exception 'Song is not in the current User''s list';
  end if;

  select s.is_discoverable, s.first_discoverable_at
  into v_is_discoverable, v_first_discoverable_at
  from public.songs s
  where s.id = p_song_id;

  select count(*) into membership_count
  from public.song_user_data where song_id = p_song_id;

  select count(*) into canonical_recording_count
  from public.recordings where song_id = p_song_id;

  select count(*) into saved_recording_count
  from public.user_recording_data urd
  join public.recordings r on r.id = urd.recording_id
  where urd.user_id = v_user_id and r.song_id = p_song_id;

  blocked_reason := null;
  if not v_is_discoverable
     and membership_count = 1
     and canonical_recording_count > 0 then
    action := 'blocked';
    blocked_reason :=
      'This hidden Song has canonical Recordings. Remove or reassign those dependencies before deleting the sole membership.';
  elsif not v_is_discoverable
        and v_first_discoverable_at is null
        and membership_count = 1 then
    action := 'delete_song';
  else
    action := 'remove_membership';
  end if;

  return next;
end
$$;

create or replace function public.remove_song_from_library(p_song_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_action text;
  v_blocked_reason text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform 1 from public.songs where id = p_song_id for update;

  select impact.action, impact.blocked_reason
  into v_action, v_blocked_reason
  from public.song_removal_impact(p_song_id) impact;

  if v_action = 'blocked' then
    raise exception '%', v_blocked_reason;
  end if;

  delete from public.user_recording_data urd
  using public.recordings r
  where urd.user_id = v_user_id
    and urd.recording_id = r.id
    and r.song_id = p_song_id;

  if v_action = 'delete_song' then
    delete from public.songs where id = p_song_id;
  else
    delete from public.song_user_data
    where user_id = v_user_id and song_id = p_song_id;
  end if;

  return v_action;
end
$$;

revoke all on function public.create_song_with_membership(
  uuid, text, smallint, text, text, uuid
) from public;
revoke all on function public.add_discoverable_song(uuid) from public;
revoke all on function public.set_song_discoverability(uuid, boolean) from public;
revoke all on function public.song_removal_impact(uuid) from public;
revoke all on function public.remove_song_from_library(uuid) from public;

grant execute on function public.create_song_with_membership(
  uuid, text, smallint, text, text, uuid
) to authenticated;
grant execute on function public.add_discoverable_song(uuid) to authenticated;
grant execute on function public.set_song_discoverability(uuid, boolean)
  to authenticated;
grant execute on function public.song_removal_impact(uuid) to authenticated;
grant execute on function public.remove_song_from_library(uuid)
  to authenticated;

-- Reauthorize Recording creation against current Song membership. All other
-- validation and bounded provider writes remain unchanged.
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
    from public.song_user_data
    where song_id = p_song_id and user_id = v_user_id
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
      when youtube_items.search_category = 'song'
        or excluded.search_category = 'song' then 'song'
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
    ytmusic_artist_id = coalesce(
      excluded.ytmusic_artist_id,
      youtube_items.ytmusic_artist_id
    ),
    ytmusic_artist_name = coalesce(
      excluded.ytmusic_artist_name,
      youtube_items.ytmusic_artist_name
    ),
    ytmusic_album_id = coalesce(
      excluded.ytmusic_album_id,
      youtube_items.ytmusic_album_id
    ),
    ytmusic_album_name = coalesce(
      excluded.ytmusic_album_name,
      youtube_items.ytmusic_album_name
    ),
    duration_seconds = coalesce(
      excluded.duration_seconds,
      youtube_items.duration_seconds
    ),
    metadata_fetched_at = case
      when excluded.metadata_fetched_at is null
        then youtube_items.metadata_fetched_at
      when youtube_items.metadata_fetched_at is null
        then excluded.metadata_fetched_at
      else greatest(
        excluded.metadata_fetched_at,
        youtube_items.metadata_fetched_at
      )
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
        regexp_replace(
          nullif(btrim(p_channel_name), ''),
          ' - Topic$',
          ''
        )
      ),
      case
        when p_duration_seconds is null then null
        else (p_duration_seconds / 60)::text
          || ':'
          || lpad((p_duration_seconds % 60)::text, 2, '0')
      end
    )
    returning id into v_recording_id;

    insert into public.recording_youtube_items (
      recording_id,
      youtube_video_id
    ) values (v_recording_id, p_video_id);
  end if;

  insert into public.user_recording_data (user_id, recording_id)
  values (v_user_id, v_recording_id)
  on conflict (user_id, recording_id) do nothing;

  return v_recording_id;
end
$$;

revoke all on table public.site_admins from anon, authenticated;
revoke all on table public.song_user_data from anon, authenticated;
revoke all on table public.songs from anon, authenticated;

grant select on table public.song_user_data to authenticated;
grant update (notes, display_title), delete
  on table public.song_user_data to authenticated;

grant select on table public.songs to authenticated;
grant insert (
  id,
  name,
  year,
  notes,
  user_id,
  wikipedia_extract,
  wikipedia_url,
  musicbrainz_work_id
) on table public.songs to authenticated;
grant update (
  name,
  year,
  notes,
  user_id,
  wikipedia_extract,
  wikipedia_url,
  musicbrainz_work_id
) on table public.songs to authenticated;
grant delete on table public.songs to authenticated;

grant all on table public.site_admins, public.song_user_data to service_role;

comment on table public.song_user_data is
  'Private per-User Song membership, notes, title override, and added time.';
comment on column public.songs.is_discoverable is
  'Whether authenticated Users may discover and add this Song; admin-controlled.';
comment on column public.songs.first_discoverable_at is
  'First time the Song became discoverable; retained to bound safe hard deletion.';
