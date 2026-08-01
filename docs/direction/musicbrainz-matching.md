# MusicBrainz metadata and matching

MusicBrainz is the metadata backbone, but provider entities map onto Standards
entities deliberately: Work → Song, Recording → Recording, Release Group →
Release Group, Release → representative edition, and Artist → credited Artist.
Calls stay server-side behind `musicbrainzTransport.ts`, and API routes return
normalized app contracts rather than raw provider JSON.

## Original Works, translations, and repertoire identity

MusicBrainz may represent one piece of music as a family of related Works: an
original instrumental composition or original-language Song plus separate
translated or adapted lyric versions. Standards must not assume that the title
printed on a Recording identifies the exact Work. In particular, an English
title may be the common performance name, a literal translation, or a distinct
lyric adaptation with its own lyricist and Work identity.

For an instrumental repertoire Song, anchor `musicbrainz_work_id` to the
original composition or original-language Work. A User who normally calls it
by another title should use their private display title; the familiar title is
not by itself a reason to replace the shared canonical Work identity. Examples
include Portuguese `Desafinado` with recordings titled “Off Key” or “Slightly
Out of Tune,” `Corcovado` with “Quiet Nights of Quiet Stars,” and `Meditação`
with “Meditation.” MusicBrainz models several of those English lyrics as
distinct later Works. `Wave` is more explicit still: MusicBrainz has an
original instrumental Work and separate later English, Portuguese, and other
lyric Works.

Create a separate Standards Song for an adapted or translated Work when that
exact lyric version matters independently—for example, the User sings it,
needs the correct lyricist credit, or wants its Recordings kept distinct. Do
not merge the original and adaptation credits into one Song merely because the
melody is shared. Conversely, do not force an instrumental player to keep
duplicate repertoire Songs solely because provider metadata divides the lyric
versions.

The current one-`musicbrainz_work_id` Song model cannot match every member of a
Work family. Recording search for an original Work can miss a Recording linked
only to a translated/adapted Work, while broad title search can return it
without proving the relationship. Until Work-family matching exists, preserve
the original Work anchor, keep text-search candidates visible, and require
manual confirmation for the related lyric-version case.

A future Work-family implementation should traverse explicit MusicBrainz
translated-version, version-of, and basis relationships from the anchored
Work; use those related Work IDs as matching evidence; and retain the exact
Work relationship for each selected Recording. It must not treat title
similarity alone as proof of family membership or silently change the Song's
canonical Work and credits.

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

Album import is a Recording-only workflow. It is deliberately not exposed from
the Songs list; its eventual product entry point remains undecided. The
implemented matching flow searches YouTube Music for the media album, chooses
its exact MusicBrainz Release, then matches the two tracklists by normalized
title and duration. The release remains a discovery vehicle; each selected
Recording is enriched through the same single-Recording path described above.

The workflow may attach more than one Recording (such as alternate takes) to
the same existing Song, but it never creates Songs. Tracks without exactly one
existing-Song match, and tracks without a clear MusicBrainz Recording match,
remain disabled and untouched. Import runs sequentially and stops with an
honest partial-success message if media persistence or enrichment fails.

## Remaining work

- Decide whether album import belongs in the product, and if so where it starts,
  before exposing the existing workflow again.
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
- Add explicit Work-family discovery and Recording matching for translated and
  adapted lyric versions. Keep this separate from the parent-Work “Part of”
  hierarchy: derivation/translation and containment are different
  relationships.
