# Refresh a Recording's YouTube / ytmusic data

Give Recording detail an explicit action that re-pulls YouTube Music provider
data for an already-saved Recording and overwrites the shared YouTube Item and
canonical Recording fields in place. This replaces the delete-and-re-add
workaround, which cannot refresh anything: delete only removes the current
User's `user_recording_data` link, and the add path
(`save_youtube_recording`) is intentionally non-destructive — it `coalesce`-
merges the shared `youtube_items` row and reuses the existing `recordings` row
as-is (see [add-recording-modal.md](add-recording-modal.md)). So re-adding
returns the same stale data.

## Why "search + pick" rather than a videoId lookup

The enrichment fields the User wants —
`ytmusic_artist_id / ytmusic_artist_name / ytmusic_album_id /
ytmusic_album_name` — only come from a **ytmusic text search**
(`/api/youtube-search?source=ytmusic`). There is no provider endpoint that
returns ytmusic data for a known videoId. `/api/youtube-video` returns plain
YouTube data (title, channel, duration) only.

**Decided:** refresh opens a ytmusic search (seeded from the Recording title /
Song title, like AddRecordingModal), the User picks the correct result, and its
provider fields overwrite the shared rows. The User-driven pick avoids
silently binding wrong ytmusic metadata from a fuzzy videoId match.

## The overwrite boundary

**Decided:** refresh overwrites only **shared provider-sourced** fields on the
YouTube Item (`title`, `channel_name`, `search_category`,
`ytmusic_artist_*`, `ytmusic_album_*`, `duration_seconds`,
`metadata_fetched_at`) and the provider-derived fields on the canonical
`recordings` row that were seeded from the provider at first save (`name`,
`artist`, `duration`). It must not touch:

- Any `user_recording_data` (the current User's or anyone else's) — notes,
  ratings, ordering.
- MusicBrainz-sourced fields on the Recording (`musicbrainz_recording_id`,
  release/release-group links, performers, recording dates, location) — those
  have their own sync action.

`discovery_sources` is additive as today; refreshing adds `ytmusic_search`
without dropping prior sources.

**Blocked — needs a decision:** whether refresh may re-point the Recording to a
**different videoId** when the picked ytmusic result has one, or whether it is
constrained to results carrying the Recording's existing videoId. Re-pointing
changes `recording_youtube_items` and effectively means "this is a different
video," which overlaps with delete/re-add semantics. Default proposed: constrain
the pick to the existing videoId — refresh re-enriches, it does not re-link.

## Shared-model caveat

Overwriting shared rows affects every User crediting the same canonical
Recording. Acceptable for this small deployment, but the new RPC must still
enforce that the caller has a `user_recording_data` link (or Song ownership)
before mutating, mirroring the auth checks in `save_youtube_recording` and
`update_saved_recording`.

## Surfaces

- New security-definer RPC (e.g. `refresh_youtube_recording`) that performs the
  bounded overwrite atomically, with the auth check above.
- Recording detail: a "Refresh from YouTube" action that opens the ytmusic
  search picker and calls the RPC, then re-loads the Recording.
