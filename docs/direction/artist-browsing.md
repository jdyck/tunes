# Artist browsing

The main navigation already includes an Artists destination, but it has no implemented browse/detail experience. Build an Artists pane that follows the Songs-pane pattern: searchable/filterable list on the left and a selected Artist's detail in the parallel detail pane.

The detail should bring together an Artist's relationship to the repertoire:

- per-user editable tags and personal notes;
- a **Compositions** section for Songs they are credited with writing; and
- a **Recordings** section for recordings on which they are credited as an artist.

If a suitable metadata source can be matched reliably, enrich the detail with a short shared canonical biographical/background section. Prefer the existing MusicBrainz/Wikipedia integration patterns over introducing a new provider, but keep sourced biography separate from per-user editable personal notes and make an absent or unmatched biography an ordinary state.

## Data model: person identity lives in `people`

`Recording.artist` is currently a single free-text publication credit, while the unused `artists` and `recording_artists` tables were reserved for structured performers; Song writer credits currently use `people`. Do not build a second, competing artist identity on top of these fields.

The product needs to distinguish:

- the credited act attached to a release/album or Recording, which may be a group; and
- the individual people who actually performed on a Recording, including performers who are not named in that publication credit.

A group credit must not stand in for its members or prevent individual performer credits. Keep the publication/album credit in the existing free-text `Recording.artist` field and show it on Recording detail; it does not need its own browsable identity or group detail page at this stage. The Artists browse feature is for individual people connected to the repertoire as writers or structured performers. Do not infer individual performers from the free-text credited act.

**Decided:** the single person identity is the existing `people` table — the Artists pane lists and details `people` rows. Structured performer credits must therefore connect Recordings to `people`, not to a separate `artists` identity; when implementing, reconcile or retire the unused `artists`/`recording_artists` tables so they reference `people` rather than becoming a second identity. Writer credits already use `people`, so Compositions works from day one.

Note the data dependency: no structured performer credits exist yet — populating them is part of the [musicbrainz-matching.md](musicbrainz-matching.md) work — so the Recordings section will be empty until that lands. Build it as an ordinary empty state, not a blocker.
