-- Expand the shared Recording/Work model without deriving performance facts
-- from legacy release metadata. Existing clients keep their scalar RPC while
-- the new JSON-bundle overload provides presence-aware partial updates.

create function public.music_date_lower(p_value text)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select substring(p_value, 1, 4)::integer * 10000
       + coalesce(nullif(substring(p_value, 6, 2), '')::integer, 1) * 100
       + coalesce(nullif(substring(p_value, 9, 2), '')::integer, 1)
$$;

create function public.music_date_upper(p_value text)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select substring(p_value, 1, 4)::integer * 10000
       + coalesce(nullif(substring(p_value, 6, 2), '')::integer, 12) * 100
       + case
           when length(p_value) = 10 then substring(p_value, 9, 2)::integer
           when length(p_value) = 7 then
             extract(day from (
               make_date(substring(p_value, 1, 4)::integer,
                         substring(p_value, 6, 2)::integer, 1)
               + interval '1 month - 1 day'
             ))::integer
           else 31
         end
$$;

create function public.music_date_valid(p_value text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case length(p_value)
    when 4 then p_value <> '0000'
    when 7 then to_char(to_date(p_value || '-01', 'YYYY-MM-DD'), 'YYYY-MM') = p_value
    when 10 then to_char(to_date(p_value, 'YYYY-MM-DD'), 'YYYY-MM-DD') = p_value
    else false
  end
$$;

create table public.release_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  musicbrainz_release_group_id uuid
);

-- Keep the provider column nullable for a future Discogs-only master, but use
-- a partial index as the MusicBrainz insert-or-get conflict target.
create unique index release_groups_musicbrainz_id_idx
  on public.release_groups(musicbrainz_release_group_id)
  where musicbrainz_release_group_id is not null;

alter table public.release_groups enable row level security;
create policy "Authenticated users read Release Groups"
  on public.release_groups for select to authenticated using (true);
revoke all on table public.release_groups from anon, authenticated;
grant select on table public.release_groups to authenticated;
grant all on table public.release_groups to service_role;

alter table public.recordings
  add column recording_date_start text,
  add column recording_date_end text,
  add column recording_location text,
  add column release_group_id uuid references public.release_groups(id),
  add constraint recordings_date_start_shape check (
    recording_date_start is null or (
      recording_date_start ~ '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$'
      and public.music_date_valid(recording_date_start)
    )
  ),
  add constraint recordings_date_end_shape check (
    recording_date_end is null or (
      recording_date_end ~ '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$'
      and public.music_date_valid(recording_date_end)
    )
  ),
  add constraint recordings_date_range_check check (
    recording_date_end is null or (
      recording_date_start is not null and
      public.music_date_lower(recording_date_start)
        <= public.music_date_upper(recording_date_end)
    )
  );
create index recordings_release_group_id_idx
  on public.recordings(release_group_id);

alter table public.songs
  add column work_date_start text,
  add column work_date_end text,
  add constraint songs_work_date_start_shape check (
    work_date_start is null or (
      work_date_start ~ '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$'
      and public.music_date_valid(work_date_start)
    )
  ),
  add constraint songs_work_date_end_shape check (
    work_date_end is null or (
      work_date_end ~ '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$'
      and public.music_date_valid(work_date_end)
    )
  ),
  add constraint songs_work_date_range_check check (
    work_date_end is null or (
      work_date_start is not null and
      public.music_date_lower(work_date_start)
        <= public.music_date_upper(work_date_end)
    )
  );

create function public.update_saved_recording(
  p_recording_id uuid,
  p_shared jsonb default '{}'::jsonb,
  p_private jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_release_group_id uuid;
  v_release_group jsonb;
  v_performers jsonb;
  v_credit jsonb;
  v_artist_id uuid;
  v_position bigint;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.user_recording_data
    where user_id = v_user_id and recording_id = p_recording_id
  ) then raise exception 'Saved Recording not found'; end if;
  if jsonb_typeof(p_shared) <> 'object' or jsonb_typeof(p_private) <> 'object' then
    raise exception 'Recording update bundles must be JSON objects';
  end if;
  if p_shared ? 'kind' and p_shared->>'kind' is not null
     and p_shared->>'kind' not in ('released', 'video_capture') then
    raise exception 'Invalid Recording kind';
  end if;

  if p_shared ? 'release_group' then
    v_release_group := p_shared->'release_group';
    if v_release_group = 'null'::jsonb then
      v_release_group_id := null;
    else
      if jsonb_typeof(v_release_group) <> 'object'
         or nullif(btrim(v_release_group->>'title'), '') is null
         or nullif(btrim(v_release_group->>'musicbrainz_release_group_id'), '') is null then
        raise exception 'Release Group requires a title and MusicBrainz id';
      end if;
      insert into public.release_groups(title, musicbrainz_release_group_id)
      values (
        btrim(v_release_group->>'title'),
        (v_release_group->>'musicbrainz_release_group_id')::uuid
      )
      on conflict (musicbrainz_release_group_id)
        where musicbrainz_release_group_id is not null
      do update set title = public.release_groups.title
      returning id into v_release_group_id;
    end if;
  end if;

  update public.recordings r set
    name = case when p_shared ? 'name' then p_shared->>'name' else r.name end,
    kind = case when p_shared ? 'kind' then p_shared->>'kind' else r.kind end,
    artist = case when p_shared ? 'artist' then p_shared->>'artist' else r.artist end,
    year = case when p_shared ? 'year' then p_shared->>'year' else r.year end,
    album = case when p_shared ? 'album' then p_shared->>'album' else r.album end,
    duration = case when p_shared ? 'duration' then p_shared->>'duration' else r.duration end,
    musicbrainz_recording_id = case when p_shared ? 'musicbrainz_recording_id'
      then nullif(p_shared->>'musicbrainz_recording_id', '')::uuid
      else r.musicbrainz_recording_id end,
    musicbrainz_release_id = case when p_shared ? 'musicbrainz_release_id'
      then nullif(p_shared->>'musicbrainz_release_id', '')::uuid
      else r.musicbrainz_release_id end,
    recording_date_start = case when p_shared ? 'recording_date_start'
      then p_shared->>'recording_date_start' else r.recording_date_start end,
    recording_date_end = case when p_shared ? 'recording_date_end'
      then p_shared->>'recording_date_end' else r.recording_date_end end,
    recording_location = case when p_shared ? 'recording_location'
      then p_shared->>'recording_location' else r.recording_location end,
    release_group_id = case when p_shared ? 'release_group'
      then v_release_group_id else r.release_group_id end
  where r.id = p_recording_id;

  update public.user_recording_data urd set
    notes = case when p_private ? 'notes' then p_private->>'notes' else urd.notes end,
    rating = case when p_private ? 'rating' then (p_private->>'rating')::smallint else urd.rating end,
    sort_order = case when p_private ? 'sort_order' then (p_private->>'sort_order')::smallint else urd.sort_order end,
    tags = case when p_private ? 'tags' then
      case when p_private->'tags' = 'null'::jsonb then null
      else array(select jsonb_array_elements_text(p_private->'tags')) end
      else urd.tags end,
    key = case when p_private ? 'key' then p_private->>'key' else urd.key end,
    tempo = case when p_private ? 'tempo' then p_private->>'tempo' else urd.tempo end
  where urd.user_id = v_user_id and urd.recording_id = p_recording_id;

  if p_shared ? 'performers' then
    v_performers := p_shared->'performers';
    if jsonb_typeof(v_performers) <> 'array' or jsonb_array_length(v_performers) > 100 then
      raise exception 'Performers must be a JSON array of at most 100 entries';
    end if;
    delete from public.recording_artist_credits where recording_id = p_recording_id;
    for v_credit, v_position in
      select value, ordinality - 1
      from jsonb_array_elements(v_performers) with ordinality
    loop
      if nullif(btrim(v_credit->>'credited_as'), '') is null
         or nullif(btrim(v_credit->>'musicbrainz_artist_id'), '') is null then
        raise exception 'Performer requires credited-as text and MusicBrainz id';
      end if;
      insert into public.artists(name, kind, musicbrainz_artist_id)
      values (
        coalesce(nullif(btrim(v_credit->>'name'), ''), btrim(v_credit->>'credited_as')),
        nullif(v_credit->>'kind', ''),
        (v_credit->>'musicbrainz_artist_id')::uuid
      )
      on conflict (musicbrainz_artist_id) do update
        set kind = coalesce(public.artists.kind, excluded.kind)
      returning id into v_artist_id;
      insert into public.recording_artist_credits(
        recording_id, artist_id, role, credited_as, sort_order
      ) values (
        p_recording_id, v_artist_id, 'performer', btrim(v_credit->>'credited_as'), v_position
      );
    end loop;
  end if;
end
$$;

revoke all on function public.update_saved_recording(uuid, jsonb, jsonb) from public;
grant execute on function public.update_saved_recording(uuid, jsonb, jsonb) to authenticated;
revoke all on function public.music_date_lower(text), public.music_date_upper(text),
  public.music_date_valid(text)
  from public;

comment on table public.release_groups is
  'Shared provider-neutral master-level publication identities.';
comment on function public.update_saved_recording(uuid, jsonb, jsonb) is
  'Presence-aware atomic update for a saved Recording, including bounded shared MusicBrainz enrichment.';

do $$
begin
  if exists (select 1 from public.recordings where recording_date_start is not null) then
    raise exception 'MusicBrainz expansion must not backfill release years as recording dates';
  end if;
  if exists (select 1 from public.release_groups where musicbrainz_release_group_id is null) then
    raise exception 'The app must not mint provider-less Release Groups';
  end if;
end
$$;
