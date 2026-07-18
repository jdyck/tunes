# MusicBrainz matching quality

Recording matching works, but it matches the wrong entities and captures a thin slice of what MusicBrainz knows. Observed with "But Beautiful" (Nat King Cole): the song is paired to the right work, but the app matched the YouTube recording to a MusicBrainz recording whose first-release-date is 1997 (a compilation orphan), on a reissue release with no useful relationships — while the canonical release carries the true recording date (1958-05), lyricist, composer, and publishers. Same pattern with *Ella Fitzgerald Sings the Jerome Kern Songbook*: the well-documented release has per-track engineer, producer, conductor, arranger, recording date (1963), and work provenance (composed 1927, from *Show Boat*), none of which the app sees.

## Why it happens (current code, `src/lib/musicbrainz.ts`)

- `searchRecordingMatches` ranks candidates by duration/album-hint/year/score only. It never uses the song's already-known `musicbrainz_work_id`, so among the many never-merged duplicate Recordings of a standard it can't tell the canonical, well-linked one from a budget-compilation orphan. The "earliest year wins" tiebreak partially compensates but picked 1997 here because the orphan *is* a separate recording entity.
- `year` is taken from the recording's `first-release-date` — a release year, not the performance date. The true recording date lives on the recording→work relationship (`begin`), which is never fetched during search.
- `pickAlbum` chooses a release by album-hint match or earliest date, ignoring release status/type (official album vs. compilation/reissue), relationship richness, and cover-art availability.
- Nothing release-level is captured beyond title + id, and nothing is amortized: matching 12 tracks from one songbook album means 12 independent searches with no shared release context.

## Decided semantics

Date and album semantics are settled in [ADR-0007](../adr/0007-original-dates-and-albums.md): song year = year written; recording date = performance date (full-precision `recording_date`, year-level display for now); album = the most original release, with reissue/media detail demoted to a future detail modal.

Matching stays user-confirmed for now — the app suggests, the user confirms. A couple of MusicBrainz requests per match is acceptable (their 1 req/s limit is fine at this usage).

## Direction

Matching backbone stays MusicBrainz — recordings and works (true dates, composer/lyricist, show/film provenance) exist only there. Discogs/AllMusic are release-centric; if used at all, they'd supplement a chosen release (art, credits), which is a separate concern from matching.

**First milestone = items 1 + 2 below** (work-aware matching + true recording date), shippable before any schema expansion.

## Work items

1. **Work-aware recording matching** — when the song has a `musicbrainz_work_id`, use it: browse recordings of that work, or rank search candidates by linkage to it. Should eliminate the orphan-duplicate problem outright. *Unblocked.* Open sub-question: when the top text-search candidate isn't linked to the work (MusicBrainz work links are incomplete), rank it down rather than hide it — revisit if that proves noisy.
2. **True recording date** — fetch work-rels for candidate/linked recordings and store the performance date (`recording_date`, full precision) instead of first-release year. *Unblocked.* Head start: `fetchRecordingMatch` already requests `inc=work-rels` and the response is discarded unparsed — the resolve/resync path only needs mapping code, no extra requests.
3. **Original-release selection** — prefer the most original release (official status, earliest, non-compilation) per the decided album semantics; keep the matched release id for a future release-detail modal. *Unblocked by the semantics above; spec the ranking heuristics when picked up.*
4. **Structured performers** — selected performers per recording (e.g. Barney Kessel on guitar on the Julie London recording); the unused `artists`/`recording_artists` tables were reserved for exactly this ([metadata-fields.md](metadata-fields.md)). Structured, not free text. *Future feature.*
5. **Work provenance** — "part of" (e.g. *Show Boat*) as a plain text field on the Song; no browsing/querying by show. *Unblocked, small.* Other credits (producer, engineer, publisher, arranger) are not wanted yet.
6. **Release-level amortization** — when adding a track whose album's release was already matched for a sibling track, auto-suggest that release's recording first. *Blocked* on items 1–3.

## Future features (flagged, not scoped)

- Side-scroll through alternative match candidates instead of a single suggestion.
- Cover art borrowed from another release of the same album when the matched release has none — user-triggered, never automatic.
- Release-detail modal exposing pressing/media/remaster data.
