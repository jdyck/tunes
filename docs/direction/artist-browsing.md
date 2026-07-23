# Artist browsing

The main navigation already includes an Artists destination, but it has no implemented browse/detail experience. Build an Artists pane that follows the Songs-pane pattern: searchable/filterable list on the left and a selected Artist's detail in the parallel detail pane.

The detail should bring together an Artist's relationship to the repertoire:

- User-specific editable tags and personal notes;
- a **Compositions** section for Songs they are credited with writing; and
- a **Recordings** section for recordings on which they are credited as an artist.

If a suitable metadata source can be matched reliably, enrich the detail with a short shared canonical biographical/background section. Prefer the existing MusicBrainz/Wikipedia integration patterns over introducing a new provider, but keep sourced biography separate from User-specific editable personal notes and make an absent or unmatched biography an ordinary state.

## Data model: credited identity lives in `artists`

Per [ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md), Artist is the shared, provider-neutral identity for anything that can receive a musical credit. It is deliberately broader than Person and may carry a kind such as person, group, orchestra, choir, character, or other. Kind remains null when unknown; do not turn missing source data into `other`. MusicBrainz Artist IDs attach to this identity rather than defining it.

The schema exposes `artists` as the single shared canonical identity, private notes/tags in `artist_user_data` (at most one row per User/Artist), and role-bearing `song_artist_credits` / `recording_artist_credits` relationships. Build browsing on those Artist-backed surfaces; do not reintroduce a separate Person identity for Song writers.

The product still distinguishes a Recording's published credited-as text from its structured Artist relationships. Keep `Recording.artist` as an editable display snapshot: “Billie Holiday” or a group credit can be what the release says even when other individually credited performers are also attached. Do not infer group members or individual performers from that free text. A group credit also does not stand in for its members; both can be represented when the evidence supports both relationships.

The Artists pane lists all Artist kinds rather than silently filtering out groups. Kind can be shown only when useful for disambiguation or filtering; it does not need to clutter every row. Compositions come from Song-to-Artist credits whose role is composer, lyricist, or writer. Recordings come from structured Recording-to-Artist credits.

Structured Recording performer credits are not populated yet. Their absence remains an ordinary empty state rather than an error, and populating them is part of the later [musicbrainz-matching.md](musicbrainz-matching.md) work.

Because the pane combines shared canonical facts with private `artist_user_data`, saving notes/tags must never issue a broad update to the canonical Artist row. The write policy for editing shared Artist metadata is a separate migration concern; see [canonical-entity-migrations.md](canonical-entity-migrations.md).
