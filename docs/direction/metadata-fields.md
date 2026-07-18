# Richer metadata fields

**Songs**: composer/year/lyricist remain the only structured fields. Year now means year written ([ADR-0007](../adr/0007-original-dates-and-albums.md)); a "part of" text field (e.g. *Show Boat*) is planned — see [musicbrainz-matching.md](musicbrainz-matching.md).

**Recordings**: built out. `kind` (`released` / `video_capture`, future `user_upload`) was the first decided field — see [domain-model.md](../domain-model.md). Since then, `artist`, `album`, `year`, `duration`, `key`, `tempo`, and `tags` were added as plain columns (all free text/simple types, no controlled vocabulary):

- `artist`, `duration`, `album`, and `year` auto-fill when a recording is picked from YouTube search (see [streaming-platform-links.md](streaming-platform-links.md)) but stay editable; `key`, `tempo`, and `tags` are always hand-entered — nothing sources them automatically.
- `year` means performance date, not release date ([ADR-0007](../adr/0007-original-dates-and-albums.md)); a full-precision `recording_date` supersedes it when the [musicbrainz-matching.md](musicbrainz-matching.md) work lands.
- `artist` is a single free-text value — the publication-credited artist — not a structured performer list, because attribution is genuinely ambiguous (e.g. Barney Kessel playing guitar on a Billie Holiday recording). Structured selected-performers is now a planned future feature (see [musicbrainz-matching.md](musicbrainz-matching.md)), to be backed by the existing unused `artists` and `recording_artists` tables; the single `artist` field stays regardless.
- The free-text `name` field is unaffected by any of this — it's still the recording's own title/descriptor, separate from `artist`.
