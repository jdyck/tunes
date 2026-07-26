-- Cache identity-backed Artist portraits resolved through
-- MusicBrainz -> Wikidata -> Wikimedia Commons. A completed timestamp with a
-- null URL is the durable "looked up, no image found" state.

alter table public.artists
  add column wikidata_id text,
  add column image_url text,
  add column image_source_url text,
  add column image_license text,
  add column image_lookup_completed_at timestamptz,
  add constraint artists_wikidata_id_check
    check (wikidata_id is null or wikidata_id ~ '^Q[0-9]+$'),
  add constraint artists_image_url_check
    check (image_url is null or image_url ~ '^https://upload\.wikimedia\.org/'),
  add constraint artists_image_source_url_check
    check (image_source_url is null or image_source_url ~ '^https://commons\.wikimedia\.org/');

create or replace function public.reset_artist_image_cache_on_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.musicbrainz_artist_id is distinct from old.musicbrainz_artist_id then
    new.wikidata_id := null;
    new.image_url := null;
    new.image_source_url := null;
    new.image_license := null;
    new.image_lookup_completed_at := null;
  end if;
  return new;
end
$$;

create trigger reset_artist_image_cache_on_identity_change
before update of musicbrainz_artist_id on public.artists
for each row
execute function public.reset_artist_image_cache_on_identity_change();

grant select (wikidata_id, image_url, image_source_url, image_license, image_lookup_completed_at)
  on table public.artists to authenticated;

comment on column public.artists.image_lookup_completed_at is
  'When non-null, the MusicBrainz/Wikidata/Commons image lookup has completed; image_url remains null for a cached miss.';
