-- Replace a Song's Artist credits atomically through the approved bounded
-- write path. The deployed legacy client may continue writing song_writers
-- directly until the later contraction removes that compatibility access.

create or replace function public.replace_song_artist_credits(
  p_song_id uuid,
  p_credits jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_credit jsonb;
  v_position bigint;
  v_role text;
  v_credited_as text;
  v_canonical_name text;
  v_kind text;
  v_requested_artist_id uuid;
  v_musicbrainz_artist_id uuid;
  v_artist_id uuid;
  v_existing_musicbrainz_artist_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.songs s
    where s.id = p_song_id
      and (
        public.is_site_admin()
        or (
          not s.is_discoverable
          and exists (
            select 1
            from public.song_user_data sud
            where sud.song_id = s.id
              and sud.user_id = v_user_id
          )
        )
      )
  ) then
    raise exception 'Song Artist credits are not editable by the current User';
  end if;

  if p_credits is null or jsonb_typeof(p_credits) <> 'array' then
    raise exception 'Song Artist credits must be a JSON array';
  end if;

  if jsonb_array_length(p_credits) > 100 then
    raise exception 'A Song cannot have more than 100 Artist credits';
  end if;

  delete from public.song_writers
  where song_id = p_song_id;

  for v_credit, v_position in
    select value, ordinality - 1
    from jsonb_array_elements(p_credits) with ordinality
  loop
    if jsonb_typeof(v_credit) <> 'object' then
      raise exception 'Each Song Artist credit must be an object';
    end if;

    v_role := v_credit ->> 'role';
    v_credited_as := nullif(btrim(v_credit ->> 'credited_as'), '');
    v_canonical_name := nullif(
      btrim(coalesce(v_credit ->> 'canonical_name', v_credited_as)),
      ''
    );
    v_kind := nullif(btrim(v_credit ->> 'artist_kind'), '');
    v_requested_artist_id := nullif(
      btrim(v_credit ->> 'artist_id'),
      ''
    )::uuid;
    v_musicbrainz_artist_id := nullif(
      btrim(v_credit ->> 'musicbrainz_artist_id'),
      ''
    )::uuid;

    if v_role is null or v_role not in ('composer', 'lyricist', 'writer') then
      raise exception 'Invalid Song Artist credit role';
    end if;
    if v_credited_as is null then
      raise exception 'Song Artist credited-as text is required';
    end if;
    if v_kind is not null and v_kind not in (
      'person', 'group', 'orchestra', 'choir', 'character', 'other'
    ) then
      raise exception 'Invalid Artist kind';
    end if;

    v_artist_id := null;

    if v_requested_artist_id is not null then
      select a.id, a.musicbrainz_artist_id
      into v_artist_id, v_existing_musicbrainz_artist_id
      from public.artists a
      where a.id = v_requested_artist_id;

      if v_artist_id is null then
        raise exception 'Song Artist credit references an unknown Artist';
      end if;

      if v_musicbrainz_artist_id is not null then
        if v_existing_musicbrainz_artist_id is not null
           and v_existing_musicbrainz_artist_id <> v_musicbrainz_artist_id then
          raise exception 'Artist is already linked to a different MusicBrainz Artist';
        end if;

        select a.id
        into v_artist_id
        from public.artists a
        where a.musicbrainz_artist_id = v_musicbrainz_artist_id;

        if v_artist_id is null then
          v_artist_id := v_requested_artist_id;
          update public.artists
          set
            musicbrainz_artist_id = v_musicbrainz_artist_id,
            kind = coalesce(kind, v_kind)
          where id = v_artist_id;
        end if;
      end if;
    elsif v_musicbrainz_artist_id is not null then
      select a.id
      into v_artist_id
      from public.artists a
      where a.musicbrainz_artist_id = v_musicbrainz_artist_id;

      if v_artist_id is null then
        if v_canonical_name is null then
          raise exception 'A new Artist requires a canonical name';
        end if;

        insert into public.artists (
          name,
          kind,
          musicbrainz_artist_id
        ) values (
          v_canonical_name,
          v_kind,
          v_musicbrainz_artist_id
        )
        returning id into v_artist_id;
      end if;
    else
      if v_canonical_name is null then
        raise exception 'A new Artist requires a canonical name';
      end if;

      insert into public.artists (name, kind)
      values (v_canonical_name, v_kind)
      returning id into v_artist_id;
    end if;

    if v_musicbrainz_artist_id is not null then
      update public.artists
      set kind = coalesce(kind, v_kind)
      where id = v_artist_id;
    end if;

    insert into public.song_writers (
      song_id,
      person_id,
      artist_id,
      role,
      credited_as,
      sort_order
    ) values (
      p_song_id,
      null,
      v_artist_id,
      v_role,
      v_credited_as,
      v_position
    );
  end loop;
end
$$;

revoke all on function public.replace_song_artist_credits(uuid, jsonb)
  from public;
grant execute on function public.replace_song_artist_credits(uuid, jsonb)
  to authenticated;

comment on function public.replace_song_artist_credits(uuid, jsonb) is
  'Atomically replaces one editable Song credit set, reusing stable or MusicBrainz-backed Artists and creating unmatched Artists without broad shared-table grants.';
