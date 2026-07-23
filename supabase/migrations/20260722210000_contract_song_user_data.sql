-- Contract the temporary Song owner/private payload after the
-- membership-aware application has been deployed and smoke-tested.

-- Catch any Song created by a legacy client during the compatibility window.
-- Existing private rows are authoritative and must not be overwritten by a
-- stale legacy notes value.
insert into public.song_user_data (
  user_id,
  song_id,
  notes,
  display_title,
  created_at
)
select
  s.user_id,
  s.id,
  s.notes,
  null,
  current_timestamp
from public.songs s
left join public.song_user_data sud
  on sud.user_id = s.user_id and sud.song_id = s.id
where sud.song_id is null;

do $$
begin
  if exists (
    select 1
    from public.songs s
    left join auth.users u on u.id = s.user_id
    where s.user_id is null or u.id is null
  ) then
    raise exception
      'Song contraction stopped: a legacy Song owner is null or invalid';
  end if;

  if exists (
    select 1
    from public.songs s
    left join public.song_user_data sud
      on sud.user_id = s.user_id and sud.song_id = s.id
    where sud.song_id is null
  ) then
    raise exception
      'Song contraction stopped: a legacy owner membership is missing';
  end if;

  if exists (
    select 1
    from public.songs s
    where not exists (
      select 1
      from public.song_user_data sud
      where sud.song_id = s.id
    )
  ) then
    raise exception
      'Song contraction stopped: a Song has no private membership';
  end if;
end
$$;

drop trigger if exists sync_legacy_song_write on public.songs;
drop function if exists public.sync_legacy_song_write();

drop policy if exists "Users read visible Songs during transition"
  on public.songs;
drop policy if exists "Legacy clients create hidden Songs during transition"
  on public.songs;
drop policy if exists "Legacy owners delete Songs during transition"
  on public.songs;

create policy "Users read visible Songs"
  on public.songs for select to authenticated
  using (
    is_discoverable
    or public.is_site_admin()
    or exists (
      select 1
      from public.song_user_data sud
      where sud.song_id = songs.id
        and sud.user_id = (select auth.uid())
    )
  );

-- New Song creation remains available to every authenticated User, but only
-- through this bounded function so the shared row and private membership are
-- created atomically and new Songs always begin non-discoverable.
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
    is_discoverable,
    first_discoverable_at
  ) values (
    p_song_id,
    btrim(p_name),
    p_year,
    p_wikipedia_extract,
    p_wikipedia_url,
    p_musicbrainz_work_id,
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

revoke all on function public.create_song_with_membership(
  uuid, text, smallint, text, text, uuid
) from public;
grant execute on function public.create_song_with_membership(
  uuid, text, smallint, text, text, uuid
) to authenticated;

-- Remove every direct shared-Song write granted for the legacy client before
-- dropping its columns, then restore only the shared-field updates used by the
-- membership-aware application. Insert and delete stay function-only.
revoke insert (
  id,
  name,
  year,
  notes,
  user_id,
  wikipedia_extract,
  wikipedia_url,
  musicbrainz_work_id
) on public.songs from authenticated;
revoke update (
  name,
  year,
  notes,
  user_id,
  wikipedia_extract,
  wikipedia_url,
  musicbrainz_work_id
) on public.songs from authenticated;
revoke delete on public.songs from authenticated;

alter table public.songs
  drop column notes,
  drop column user_id;

grant select on public.songs to authenticated;
grant update (
  name,
  year,
  wikipedia_extract,
  wikipedia_url,
  musicbrainz_work_id
) on public.songs to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'songs'
      and column_name in ('user_id', 'notes')
  ) then
    raise exception
      'Song contraction stopped: legacy columns still exist';
  end if;

  if to_regprocedure('public.sync_legacy_song_write()') is not null then
    raise exception
      'Song contraction stopped: compatibility function still exists';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.songs'::regclass
      and tgname = 'sync_legacy_song_write'
      and not tgisinternal
  ) then
    raise exception
      'Song contraction stopped: compatibility trigger still exists';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'songs'
      and policyname in (
        'Users read visible Songs during transition',
        'Legacy clients create hidden Songs during transition',
        'Legacy owners delete Songs during transition'
      )
  ) then
    raise exception
      'Song contraction stopped: a transition policy still exists';
  end if;

  if has_table_privilege('authenticated', 'public.songs', 'INSERT')
     or has_table_privilege('authenticated', 'public.songs', 'DELETE') then
    raise exception
      'Song contraction stopped: direct Song insert/delete remains granted';
  end if;

  if exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'songs'
      and grantee = 'authenticated'
      and privilege_type = 'INSERT'
  ) then
    raise exception
      'Song contraction stopped: direct Song column insert remains granted';
  end if;
end
$$;

comment on table public.songs is
  'Shared Song identity and metadata; private membership, notes, and display title live in song_user_data.';
