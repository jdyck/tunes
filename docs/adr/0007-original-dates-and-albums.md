# Dates describe creation; release identity is master-level, not an edition

Decided July 2026, while scoping MusicBrainz matching fixes ([direction/musicbrainz-matching.md](../direction/musicbrainz-matching.md)). The date semantics share one principle: this app cares about when music was *made*, not when some later edition was packaged. The release entity boundary was subsequently refined by [ADR-0008](0008-provider-neutral-music-entities-and-user-data.md), including one Release Group display context independent of performance date.

**A Song's year is the year it was written**, approximated from the earliest `begin` date among the work's composer/writer/lyricist relationships. A MusicBrainz Work carries no date of its own — only its relationships do — so this is the most direct authorship signal available. Never fall back to a recording (performance) or release date: those post-date authorship and would falsely make a song look newer. These writing-relationship dates are frequently absent; null is preferable to substituting any later date, so coverage for this field is expected to be sparse.

**A Recording's date is when it was performed/recorded — never a release date.** A 1962 session track first released on a 2000s bonus-track CD is 1962; an unreleased take surfacing on a "complete works" box set keeps its session date. MusicBrainz supplies partial dates and sometimes ranges, so preserve its precision in text `recording_date_start` / `recording_date_end` fields (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`) rather than inventing a full SQL date. Display stays year-level for now, with fuller date-display UX a later decision.

**Release identity is master-level.** A Standards Release Group represents the overall publication concept, which can be an album, EP, single, or another type. MusicBrainz Release Group and Discogs Master map to it; MusicBrainz Release and Discogs Release are particular editions. Mono/stereo editions, remasters, reissues, and regional variants therefore do not become the headline identity merely because they are the edition through which the Recording was found. A representative edition ID can be retained for source inspection, while Release Group art is the default artwork.

**One Release Group supplies recognizable display context.** It must contain the exact Recording. Prefer the earliest non-compilation, non-remix Album and otherwise the earliest available containing group. This pointer supplies title and artwork only; it does not claim complete original-publication provenance and never supplies the recording date. A trusted provider album can steer discovery without becoming the stored pointer.

## Considered

- Song year = publication year (the legally precise choice for public domain) — rejected as too nuanced to source reliably; year-written is the closest practical semantic fit even though source coverage is sparse.
- Recording year = first-release year (what MusicBrainz's `first-release-date` gives for free) — rejected: it's exactly the reissue-vs-original confusion this decision exists to prevent.
- Treating the particular MusicBrainz Release through which a Recording was found as its release identity — rejected because it confuses an edition with the master-level publication concept.
- Calling every master-level concept an album — rejected because Release Groups also include singles, EPs, and other types.

## Consequences

- Matching and sync code must source dates from the recording→work relationship, not `first-release-date` (work item in [direction/musicbrainz-matching.md](../direction/musicbrainz-matching.md)).
- Song year sync is best-effort and often null; correctness takes priority over filling the field.
- `recordings.year` is superseded by `recording_date_start` / `recording_date_end` when that work lands.
- The current `recordings.album` text is transitional. `recordings.release_group_id` is the normalized display relationship to a shared Release Group.
- A representative edition ID remains optional and subordinate to Release Group identity.
- Default display and cover art use the selected Release Group, with representative-edition artwork as a fallback.
