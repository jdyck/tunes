# Richer metadata fields

**Songs**: composer/year/lyricist remain the only structured fields; still open, no change here.

**Recordings**: built out. `kind` (`released` / `video_capture`, future `user_upload`) was the first decided field — see [domain-model.md](../domain-model.md). Since then, `artist`, `album`, `year`, `duration`, `key`, `tempo`, and `tags` were added as plain columns (all free text/simple types, no controlled vocabulary):

- `artist`, `duration`, `album`, and `year` auto-fill when a recording is picked from YouTube search (see [streaming-platform-links.md](streaming-platform-links.md)) but stay editable; `key`, `tempo`, and `tags` are always hand-entered — nothing sources them automatically.
- `artist` is a single free-text value — the publication-credited artist — not a structured performer list. That's a deliberate scope cut, not an oversight: attribution is genuinely ambiguous (e.g. Barney Kessel playing guitar on a Billie Holiday recording). An `artists` table and `recording_artists` join table already exist in the database, unused, reserved for that multi-performer feature if it's ever built.
- The free-text `name` field is unaffected by any of this — it's still the recording's own title/descriptor, separate from `artist`.
