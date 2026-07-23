-- Complete the canonical Artist rollout after the Artist-aware application
-- and two-User privacy boundary have been verified in production.

do $$
begin
  if exists (
    select 1
    from public.song_writers
    where artist_id is null
       or credited_as is null
       or nullif(btrim(credited_as), '') is null
       or person_id is distinct from artist_id
  ) then
    raise exception
      'Artist contraction stopped: a Song credit is not fully mapped';
  end if;

  if (select count(*) from public.song_writers)
       <> (select count(*) from public.song_artist_credits) then
    raise exception
      'Artist contraction stopped: compatibility credit counts differ';
  end if;

  if exists (
    select 1
    from public.people p
    full join public.artists a on a.id = p.id
    where p.id is null
       or a.id is null
       or p.name is distinct from a.name
  ) then
    raise exception
      'Artist contraction stopped: Person and Artist mirrors differ';
  end if;

  if exists (
    select 1
    from public.artists
    where notes is not null or user_id is not null
  ) then
    raise exception
      'Artist contraction stopped: legacy Artist private payload exists';
  end if;
end
$$;

drop view public.song_artist_credits;

drop trigger sync_song_writer_artist_fields on public.song_writers;
drop function public.sync_song_writer_artist_fields();

drop trigger sync_legacy_person_to_artist on public.people;
drop function public.sync_legacy_person_to_artist();

alter table public.song_writers
  drop constraint song_writers_identity_compatibility_check,
  drop column person_id,
  alter column artist_id set not null,
  alter column credited_as set not null;

drop table public.people;

alter table public.song_writers
  rename to song_artist_credits;

alter table public.song_artist_credits
  rename constraint song_writers_pkey
    to song_artist_credits_pkey;
alter table public.song_artist_credits
  rename constraint song_writers_song_id_fkey
    to song_artist_credits_song_id_fkey;
alter table public.song_artist_credits
  rename constraint song_writers_artist_id_fkey
    to song_artist_credits_artist_id_fkey;
alter table public.song_artist_credits
  rename constraint song_writers_role_check
    to song_artist_credits_role_check;
alter table public.song_artist_credits
  rename constraint song_writers_credited_as_check
    to song_artist_credits_credited_as_check;

alter index public.song_writers_song_id_idx
  rename to song_artist_credits_song_id_idx;
alter index public.song_writers_artist_id_idx
  rename to song_artist_credits_artist_id_idx;

drop policy "Users read writers for visible Songs"
  on public.song_artist_credits;
drop policy "Members edit hidden writers and admins edit visible writers"
  on public.song_artist_credits;
drop policy "Members update hidden writers and admins update visible writers"
  on public.song_artist_credits;
drop policy "Members delete hidden writers and admins delete visible writers"
  on public.song_artist_credits;

create policy "Authenticated users read Song Artist credits"
  on public.song_artist_credits for select to authenticated
  using (
    exists (
      select 1
      from public.songs s
      where s.id = song_artist_credits.song_id
    )
  );

revoke all privileges
  on table public.song_artist_credits
  from anon, authenticated;
grant select
  on table public.song_artist_credits
  to authenticated;
grant all
  on table public.song_artist_credits
  to service_role;

alter table public.artists
  drop column notes,
  drop column user_id;

-- Replace the compatibility implementation because PL/pgSQL relation names
-- in the function body do not follow a later table rename automatically.
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

  delete from public.song_artist_credits
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

    insert into public.song_artist_credits (
      song_id,
      artist_id,
      role,
      credited_as,
      sort_order
    ) values (
      p_song_id,
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

comment on table public.artists is
  'Shared canonical identities that may receive Song or Recording credits.';
comment on table public.artist_user_data is
  'A User private notes and tags for a shared Artist.';
comment on table public.song_artist_credits is
  'Ordered role-bearing Artist credits for shared Songs.';
comment on function public.replace_song_artist_credits(uuid, jsonb) is
  'Atomically replaces one editable Song credit set, reusing stable or MusicBrainz-backed Artists and creating unmatched Artists without broad shared-table grants.';

do $$
begin
  if to_regclass('public.people') is not null
     or to_regclass('public.song_writers') is not null then
    raise exception
      'Artist contraction stopped: a legacy relation remains';
  end if;

  if to_regclass('public.song_artist_credits') is null then
    raise exception
      'Artist contraction stopped: target Song credits are missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'artists' and column_name in ('notes', 'user_id'))
        or (
          table_name = 'song_artist_credits'
          and column_name = 'person_id'
        )
      )
  ) then
    raise exception
      'Artist contraction stopped: a legacy column remains';
  end if;

  if exists (
    select 1
    from public.song_artist_credits sac
    left join public.artists a on a.id = sac.artist_id
    left join public.songs s on s.id = sac.song_id
    where a.id is null or s.id is null
  ) then
    raise exception
      'Artist contraction stopped: an Artist credit is orphaned';
  end if;

  if has_table_privilege(
       'authenticated',
       'public.song_artist_credits',
       'INSERT, UPDATE, DELETE'
     ) then
    raise exception
      'Artist contraction stopped: direct credit mutation remains granted';
  end if;

  if not has_table_privilege(
       'authenticated',
       'public.song_artist_credits',
       'SELECT'
     ) then
    raise exception
      'Artist contraction stopped: authenticated credit reads are missing';
  end if;

  if has_table_privilege(
       'authenticated',
       'public.artists',
       'INSERT, UPDATE, DELETE'
     ) then
    raise exception
      'Artist contraction stopped: broad Artist mutation remains granted';
  end if;

  if has_function_privilege(
       'anon',
       'public.replace_song_artist_credits(uuid, jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.replace_song_artist_credits(uuid, jsonb)',
       'EXECUTE'
     ) then
    raise exception
      'Artist contraction stopped: bounded RPC grants are incorrect';
  end if;
end
$$;
