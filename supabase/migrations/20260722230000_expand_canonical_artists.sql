-- Expand the legacy Person/User-owned Artist model into the approved shared
-- Artist boundary while keeping the deployed people/song_writers client
-- operational. The later contraction removes the compatibility path only
-- after the Artist-aware application has been deployed and verified.

do $$
begin
  if exists (select 1 from public.artists) then
    raise exception
      'Artist expansion stopped: legacy artists contains rows that require an explicit mapping';
  end if;

  if exists (select 1 from public.recording_artists) then
    raise exception
      'Artist expansion stopped: legacy recording_artists contains rows that require an explicit mapping';
  end if;

  if exists (
    select 1
    from public.people
    where nullif(btrim(name), '') is null
  ) then
    raise exception
      'Artist expansion stopped: people contains a blank name';
  end if;

  if exists (
    select 1
    from public.song_writers sw
    left join public.people p on p.id = sw.person_id
    left join public.songs s on s.id = sw.song_id
    where p.id is null or s.id is null
  ) then
    raise exception
      'Artist expansion stopped: song_writers contains an orphaned relationship';
  end if;
end
$$;

alter table public.artists
  add column kind text,
  add column musicbrainz_artist_id uuid,
  alter column name set not null,
  add constraint artists_name_check
    check (length(btrim(name)) > 0),
  add constraint artists_kind_check
    check (
      kind is null
      or kind in ('person', 'group', 'orchestra', 'choir', 'character', 'other')
    ),
  add constraint artists_musicbrainz_artist_id_key
    unique (musicbrainz_artist_id);

insert into public.artists (id, name)
select id, btrim(name)
from public.people;

create table public.artist_user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  notes text,
  tags text[],
  primary key (user_id, artist_id)
);

create index artist_user_data_artist_id_idx
  on public.artist_user_data(artist_id);

alter table public.artist_user_data enable row level security;

create policy "Users read their own Artist data"
  on public.artist_user_data for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own Artist data"
  on public.artist_user_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own Artist data"
  on public.artist_user_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own Artist data"
  on public.artist_user_data for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on table public.artist_user_data
  to authenticated;
grant all on table public.artist_user_data to service_role;

drop policy if exists "Enable insert for authenticated users only"
  on public.artists;
drop policy if exists "Enable users to view their own data only"
  on public.artists;

create policy "Authenticated users read Artists during transition"
  on public.artists for select to authenticated
  using (true);

revoke all privileges on table public.artists from anon, authenticated;
grant select (id, name, kind, musicbrainz_artist_id)
  on table public.artists
  to authenticated;
grant all on table public.artists to service_role;

alter table public.song_writers
  add column artist_id uuid,
  add column credited_as text,
  add constraint song_writers_artist_id_fkey
    foreign key (artist_id) references public.artists(id) on delete cascade,
  add constraint song_writers_identity_compatibility_check
    check (artist_id is null or artist_id = person_id),
  add constraint song_writers_credited_as_check
    check (credited_as is null or length(btrim(credited_as)) > 0);

create index song_writers_artist_id_idx
  on public.song_writers(artist_id);

update public.song_writers sw
set
  artist_id = sw.person_id,
  credited_as = p.name
from public.people p
where p.id = sw.person_id;

-- A legacy client still creates a Person before inserting its credit. Mirror
-- that identity into the shared Artist table with the same UUID, but never
-- use a later Person write to rename an existing shared Artist.
create or replace function public.sync_legacy_person_to_artist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.artists (id, name)
  values (new.id, btrim(new.name))
  on conflict (id) do nothing;

  return new;
end
$$;

revoke all on function public.sync_legacy_person_to_artist() from public;

create trigger sync_legacy_person_to_artist
after insert on public.people
for each row execute function public.sync_legacy_person_to_artist();

-- Keep both identity columns populated during mixed-version deployment. Old
-- writes supply person_id; the later bounded RPC supplies artist_id. A target
-- write creates a temporary Person mirror solely for old-client reads.
create or replace function public.sync_song_writer_artist_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artist_name text;
begin
  if new.person_id is null and new.artist_id is null then
    raise exception 'Artist credit identity is required';
  end if;

  if new.artist_id is null then
    new.artist_id := new.person_id;
  elsif new.person_id is null then
    new.person_id := new.artist_id;
  elsif new.artist_id <> new.person_id then
    raise exception 'Legacy Person and canonical Artist identities must match during transition';
  end if;

  insert into public.artists (id, name)
  select p.id, btrim(p.name)
  from public.people p
  where p.id = new.person_id
  on conflict (id) do nothing;

  select a.name
  into v_artist_name
  from public.artists a
  where a.id = new.artist_id;

  if v_artist_name is null then
    raise exception 'Artist credit references an unknown Artist';
  end if;

  insert into public.people (id, name)
  values (new.artist_id, v_artist_name)
  on conflict (id) do nothing;

  new.credited_as := coalesce(
    nullif(btrim(new.credited_as), ''),
    v_artist_name
  );

  return new;
end
$$;

revoke all on function public.sync_song_writer_artist_fields() from public;

create trigger sync_song_writer_artist_fields
before insert or update of person_id, artist_id, credited_as
on public.song_writers
for each row execute function public.sync_song_writer_artist_fields();

-- This target-name view is read-only to ordinary clients. Its underlying
-- table keeps the legacy name until contraction, while the new application
-- writes credit sets only through the bounded RPC introduced in Phase 2.
create view public.song_artist_credits
with (security_invoker = true)
as
select
  id,
  song_id,
  artist_id,
  role,
  credited_as,
  sort_order
from public.song_writers;

revoke all privileges on table public.song_artist_credits from anon, authenticated;
grant select on table public.song_artist_credits to authenticated;
grant select on table public.song_artist_credits to service_role;

-- The dormant legacy Recording relationship is empty, so it can take its
-- target name and shared-credit shape immediately without compatibility.
alter table public.recording_artists
  rename to recording_artist_credits;
alter table public.recording_artist_credits
  rename constraint recording_artists_pkey
  to recording_artist_credits_pkey;

alter table public.recording_artist_credits
  alter column recording_id drop default,
  alter column artist_id drop default,
  drop column user_id,
  add column role text not null,
  add column credited_as text not null,
  add column sort_order smallint not null default 0,
  add constraint recording_artist_credits_recording_id_fkey
    foreign key (recording_id) references public.recordings(id) on delete cascade,
  add constraint recording_artist_credits_artist_id_fkey
    foreign key (artist_id) references public.artists(id) on delete cascade,
  add constraint recording_artist_credits_role_check
    check (role = 'performer'),
  add constraint recording_artist_credits_credited_as_check
    check (length(btrim(credited_as)) > 0),
  add constraint recording_artist_credits_identity_key
    unique (recording_id, artist_id, role);

create index recording_artist_credits_artist_id_idx
  on public.recording_artist_credits(artist_id);

create policy "Authenticated users read Recording Artist credits"
  on public.recording_artist_credits for select to authenticated
  using (true);

revoke all privileges
  on table public.recording_artist_credits
  from anon, authenticated;
grant select
  on table public.recording_artist_credits
  to authenticated;
grant all
  on table public.recording_artist_credits
  to service_role;

grant select, insert, update, delete
  on table public.people, public.song_writers
  to service_role;

comment on table public.artists is
  'Shared canonical credited identities. Legacy private columns remain only during the Artist compatibility rollout.';
comment on table public.artist_user_data is
  'A User private notes and tags for a shared Artist.';
comment on view public.song_artist_credits is
  'Artist-backed Song credits exposed under the target name during compatibility rollout.';
comment on table public.recording_artist_credits is
  'Structured Artist credits for shared Recordings.';

do $$
begin
  if (select count(*) from public.artists)
       <> (select count(*) from public.people) then
    raise exception
      'Artist expansion stopped: Person-to-Artist count mismatch';
  end if;

  if exists (
    select 1
    from public.people p
    left join public.artists a on a.id = p.id
    where a.id is null or a.name is distinct from btrim(p.name)
  ) then
    raise exception
      'Artist expansion stopped: Person-to-Artist value mismatch';
  end if;

  if exists (
    select 1
    from public.song_writers sw
    join public.people p on p.id = sw.person_id
    where sw.artist_id is distinct from sw.person_id
       or sw.credited_as is distinct from p.name
  ) then
    raise exception
      'Artist expansion stopped: Song credit backfill mismatch';
  end if;

  if (select count(*) from public.song_artist_credits)
       <> (select count(*) from public.song_writers) then
    raise exception
      'Artist expansion stopped: target Song credit view count mismatch';
  end if;

  if exists (
    select 1
    from public.artists
    where notes is not null or user_id is not null
  ) then
    raise exception
      'Artist expansion stopped: private legacy Artist payload entered the shared rows';
  end if;

  if exists (select 1 from public.artist_user_data) then
    raise exception
      'Artist expansion stopped: unexpected private Artist rows were created';
  end if;

  if exists (select 1 from public.recording_artist_credits) then
    raise exception
      'Artist expansion stopped: unexpected Recording Artist credits were created';
  end if;
end
$$;
