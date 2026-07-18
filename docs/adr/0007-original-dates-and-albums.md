# Dates and albums mean the original, not the reissue

Decided July 2026, while scoping MusicBrainz matching fixes ([direction/musicbrainz-matching.md](../direction/musicbrainz-matching.md)). Three semantics, settled together because they share one principle: this app cares about when music was *made*, not when some edition of it was *packaged*.

**A Song's year is the year it was written.** The motivation is public-domain awareness, where publication date is what legally matters — and publication can lag writing (a 1930 song published as sheet music in 1931 isn't public domain until the 1931 clock runs out). That nuance is deliberately out of scope: most of the time writing and publication coincide, so year-written is the field, approximated from MusicBrainz's earliest dated relation on the work.

**A Recording's date is when it was performed/recorded — never a release date.** A 1962 session track first released on a 2000s bonus-track CD is 1962; an unreleased take surfacing on a "complete works" box set keeps its session date. Full precision is captured where MusicBrainz has it (some recordings have year-month-day), stored as `recording_date`; display stays year-level for now, with date-display UX a later decision.

**An album is the most original release.** Mono and stereo released together are one album; the same set of recordings in the same order is the same album; remasters, reissues, and regional variants are versions of it. The app prioritizes recording details over release/media details — which pressing or remaster a track was heard on is investigation material, acceptable behind a future detail modal, never the headline.

## Considered

- Song year = publication year (the legally precise choice for public domain) — rejected as too nuanced to source reliably; year-written is close enough and available.
- Recording year = first-release year (what MusicBrainz's `first-release-date` gives for free) — rejected: it's exactly the reissue-vs-original confusion this decision exists to prevent.
- Modeling releases/editions as first-class entities — not taken up; release identity is kept only as far as needed to pick the most original one.

## Consequences

- Matching and sync code must source dates from the recording→work relationship, not `first-release-date` (work item in [direction/musicbrainz-matching.md](../direction/musicbrainz-matching.md)).
- Release selection heuristics rank official/original releases above compilations and reissues.
- `recordings.year` is superseded by `recording_date` when that work lands.
