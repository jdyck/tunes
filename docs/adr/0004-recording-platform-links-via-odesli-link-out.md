# Recording platform links: store direct and Odesli-expanded links; link out rather than embed

A Recording may have a YouTube Item for embedded playback while a User also
needs to play a released Recording through services they subscribe to (Spotify,
Apple Music, Amazon Music, or YouTube Music). Performance footage, TV broadcast
rips, and other `video_capture` Recordings can remain YouTube-only rather than
pretending to have a commercial match. [ADR-0008](0008-provider-neutral-music-entities-and-user-data.md)
clarifies that a selected YouTube result is a provider item attached to a
provider-neutral Recording, not the Recording's identity.

We decided to **link out** (open the platform's own app/website) for Spotify, Apple Music, and Amazon Music, and leave the existing embedded YouTube iframe as it is. Apple Music embedding requires Apple Developer Program enrollment plus a per-user MusicKit authorization flow; Amazon Music's public API is closed-beta/partner-only with no embedding support at all; Spotify's embed degrades to a 30-second preview for most visitors anyway. None of that is worth taking on up front, and it doesn't block embedding a specific platform later — the hard part (matching a Recording to the right URL per platform, and the data model to hold those links) is identical whether the result is a link-out button or an embedded player.

Cross-platform expansion uses the free Odesli (song.link) API, which takes one
URL and returns matching links on other platforms. It is only called for
`released` Recordings, and a match is fetched once and stored rather than
re-queried live on every page view. Platform Links use a dedicated
Recording/platform relationship rather than fixed columns on `recordings`.
Links obtained directly from a selected source use the same store; Odesli
expands them rather than being the only possible source of a Platform Link. A
Recording has at most one selected link per platform.

## Considered

Embedding every platform immediately — rejected, since Apple Music alone would require a paid developer account and a real per-user auth flow before anything could ship, and Amazon Music can't be embedded regardless of effort spent.

## Consequences

Classify and match legacy Recordings one at a time when a User chooses to
rematch them; do not introduce a bulk backfill solely for Platform Links.
