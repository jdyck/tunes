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

MusicBrainz Recording artist credit initializes or refreshes the structured
Recording Attribution: preserve every referenced Artist identity, credited-as
name, position, and exact following join phrase. Do not replace source phrases
such as “with” with a hard-coded ampersand, trim meaningful join-phrase
whitespace, or deduplicate repeated Artist references. Attribution remains
separate from Recording Personnel even though both relationships reference
canonical Artists.

A successful explicit refresh replaces the complete Recording Attribution in
the draft; only Save persists it atomically with the other confirmed metadata.
A provider failure preserves the existing Attribution. Removing the
MusicBrainz Recording match preserves the editable, provider-neutral
Attribution and Attribution Fallback while clearing source-only Personnel; the
User may edit or clear an incorrect Attribution separately. Existing linked
Recordings enrich lazily on explicit refresh rather than through a bulk network
migration.

Ranking prioritizes duration proximity, then lenient credited-artist and
normalized-title agreement, a pinned album/year corroborator when supplied,
exact Work linkage, and MusicBrainz score. Title normalization removes reissue
noise such as remaster/mono/stereo/version/featuring but preserves meaningful
take/live/alternate markers. Album pinning is a soft discovery boost, not a
stored album decision and not a filter.

Recording search derives its artist text from structured Recording Attribution
when present and otherwise uses Attribution Fallback. Candidate presentation
uses the same shared Attribution formatter as saved Recording surfaces.

Search-summary Releases are provisional hints only. They may help the user
recognize a candidate but never supply a performance date or durable Release
Group relationship. Milliseconds stay inside matching and are formatted only
at the UI/save edge.

## Dates, Personnel, and location

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
place relationship. Recording Personnel maps exactly five MusicBrainz
Artist-to-Recording relationship types: instrument, vocal, conductor,
orchestra, and generic performer. Production roles, chorus master,
concertmaster, and inferred group membership stay out of this scope.
One credited Artist may retain several distinct relationships or relationship
details on the same Recording. A successful confirmed match or explicit
refresh replaces the complete structured personnel set, including clearing it
when MusicBrainz successfully returns none; a provider failure preserves the
existing set. Map the supported relationship semantics rather than storing raw
MusicBrainz relationship JSON: instrument and vocal relationships retain their
canonical attribute text plus optional credited-as text, while guest, solo,
additional, assistant, and relationship-date qualifiers remain out of scope.
Generic performer is a fallback and is omitted for an Artist when a more
specific supported relationship exists. For one Artist, merge relationships
of the same supported type and retain all distinct instrument or vocal details.
An instrument relationship with no instrument detail maps to `instrument`; a
vocal relationship with no subtype maps to `vocals`; conductor and orchestra
retain those labels. Deduplicate details only when the relationship type,
canonical detail, and optional credited-as detail are equal after case and
whitespace normalization; distinct credited-as variants remain distinct.
Existing linked Recordings are not refreshed automatically.

Removing a Recording's MusicBrainz match clears the source-derived personnel
set in the same draft but preserves structured Attribution and Attribution
Fallback. Saving persists the changes atomically; abandoning the draft
preserves the stored match and personnel.

The bounded Recording update accepts at most 100 credited Artists and 500
mapped relationship details. It validates and deduplicates the complete nested
payload before atomically replacing existing credits. This work does not change
the temporary shared Recording edit authority or introduce provenance,
verification, conflict-resolution, or admin-correction policy.

## Album identity and artwork

A Recording has one nullable `release_group_id`: the recognizable publication
context used for title and artwork. Prefer the earliest non-compilation,
non-remix studio Album containing the exact Recording; otherwise choose the
earliest available containing Release Group; otherwise leave it null. This
choice is independent of performance date and may differ from the album pinned
for discovery.

The selected MusicBrainz Release Group's artist credit initializes or refreshes
the Release Group Attribution; a representative Release's possibly different
artist credit does not replace it. Preserve the ordered credited-as names, each
referenced Artist identity, and every exact join phrase. The same Artist MBID
can therefore link to one canonical Artist while retaining a Release
Group-specific credited name such as “Nat ‘King’ Cole and His Trio.” This
Attribution never overwrites a contained Recording's Attribution.

Recording detail and a populated match/refresh draft show the Release Group
title with this album credit beside it. Stored credited Artists link to their
local Artist detail; a newly fetched draft shows the same faithfully formatted
text before Save resolves its local Artist identities. A missing Attribution is
an ordinary empty state, not a failed match.

An explicit successful match or refresh replaces the complete shared Release
Group Attribution atomically when the User saves the draft, including clearing
the list when MusicBrainz successfully returns none. A failed lookup preserves
the stored Attribution. Existing MusicBrainz-backed Release Groups enrich
lazily when a containing Recording is matched or explicitly refreshed; do not
bulk-fetch provider data as a schema migration.

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

Album import is not an active product workflow and has no UI entry point or
provider routes. The retained pure `matchAlbumTracks` contract describes the
possible matching behavior: compare a YouTube Music album with an exact
MusicBrainz Release by normalized title and duration, then attach only selected
Recordings to existing Songs.

A future workflow may attach more than one Recording (such as alternate takes) to
the same existing Song, but it never creates Songs. Tracks without exactly one
existing-Song match, and tracks without a clear MusicBrainz Recording match,
remain disabled and untouched. Import runs sequentially and stops with an
honest partial-success message if media persistence or enrichment fails.

## Remaining work

- Decide whether album import belongs in the product and where it starts before
  rebuilding a Convex-backed workflow.
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
