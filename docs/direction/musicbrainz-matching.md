# MusicBrainz metadata and matching

MusicBrainz is the metadata backbone, but provider entities map onto Standards
entities deliberately: Work → Song, Recording → Recording, Release Group →
Release Group, Release → representative edition, and Artist → credited Artist.
Calls stay server-side behind `musicbrainzTransport.ts`, and API routes return
normalized app contracts rather than raw provider JSON.

## Recording matching

The normal flow is cheap and bounded for Vercel Hobby:

1. Search by title and credited artist, using duration as the first-class
   take/version discriminator. When a Song has a Work MBID, join the Work's
   Recording relationship index. A failed Work lookup degrades the evidence;
   it never hides text-search candidates.
2. Return `clear`, `ambiguous`, or `degraded` plus a normalized candidate list.
   Only a clear winner may be proposed automatically. The user chooses among
   ambiguous or degraded candidates.
3. After selection, make one Recording lookup for the exact Work relationship
   date, place, performer relationships, Release Groups, and representative
   edition. The user still saves the populated form explicitly.

Ranking prioritizes duration proximity, then lenient credited-artist and
normalized-title agreement, a pinned album/year corroborator when supplied,
exact Work linkage, and MusicBrainz score. Title normalization removes reissue
noise such as remaster/mono/stereo/version/featuring but preserves meaningful
take/live/alternate markers. Album pinning is a soft discovery boost, not a
stored album decision and not a filter.

Search-summary Releases are provisional hints only. They may help the user
recognize a candidate but never supply a performance date or durable Release
Group relationship. Milliseconds stay inside matching and are formatted only
at the UI/save edge.

## Dates, performers, and location

Recording dates come only from the selected Recording's `performance`
relationship to the Song's exact Work. Preserve `YYYY`, `YYYY-MM`, or
`YYYY-MM-DD`; a genuine range uses `recording_date_start` and
`recording_date_end`. MusicBrainz often repeats the same value in `begin` and
`end` for one session; normalize that to start-only. Never use
`first-release-date`, an edition date, album year, or legacy `recordings.year`
as a recording date.

Work dates use the earliest composer/lyricist/writer relationship and live on
`songs.work_date_start` / `work_date_end`. Translator dates do not qualify.
They are stored for future song-age/public-domain work but have no UI yet.

The optional `recording_location` is a display string from a recorded-at/in
place relationship. Structured performer credits include MusicBrainz artist
relationships such as instrument, vocal, conductor, orchestra, or generic
performer; production roles and inferred group membership stay out.

## Album identity and artwork

A Recording has one nullable `release_group_id`: the recognizable publication
context used for title and artwork. Prefer the earliest non-compilation,
non-remix studio Album containing the exact Recording; otherwise choose the
earliest available containing Release Group; otherwise leave it null. This
choice is independent of performance date and may differ from the album pinned
for discovery.

Use Release Group cover art first and the retained representative
`musicbrainz_release_id` edition art second. A 404 is an ordinary no-art state.
Publication date remains a future Release Group concern and never falls back
into recording date.

## Persistence boundary

`release_groups` is authenticated-readable and has no direct client writes.
The bounded `update_saved_recording(uuid, jsonb, jsonb)` RPC verifies that the
caller saved the Recording, performs presence-aware partial updates, atomically
inserts-or-gets a MusicBrainz-backed Release Group, and replaces confirmed
performer credits. An absent JSON key preserves a field; a present null clears
it. The legacy scalar overload remains temporarily for deployed-client
compatibility.

Do not persist raw MusicBrainz JSON, search scores/evidence, relationship
indexes, Release type/status/date copies, artwork URLs, or every edition.

## Album import

Album import is a Recording-only workflow entered from the Songs list. Search
YouTube Music for the media album, choose its exact MusicBrainz Release, then
match the two tracklists by normalized title and duration. The release remains
a discovery vehicle; each selected Recording is enriched through the same
single-Recording path described above.

The workflow may attach more than one Recording (such as alternate takes) to
the same existing Song, but it never creates Songs. Tracks without exactly one
existing-Song match, and tracks without a clear MusicBrainz Recording match,
remain disabled and untouched. Import runs sequentially and stops with an
honest partial-success message if media persistence or enrichment fails.

## Remaining work

- Add a rare, user-triggered, client-paged deep comparison only if real
  ambiguous cases need fuller Release evidence. Never make it a synchronous
  multi-candidate route.
- Tune the documented ±3-second/near-twin thresholds against more real
  fixtures without changing the truthful state contract.
- Remove legacy `recordings.year` / `album` and the scalar save overload only
  in a separately reviewed contract migration after deployed clients and
  unmatched/manual editing paths have replacements.
- Add normalized parent-Work choices and the editable Song “Part of” field as
  its own metadata-field task.
