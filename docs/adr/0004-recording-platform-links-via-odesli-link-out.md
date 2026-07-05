# Recording platform links: matched via Odesli, link out rather than embed

`Recording.url` today is a single free-text field, always assumed to be a YouTube link, embedded directly as an iframe. We want a User to play a Recording through whichever streaming service they actually subscribe to (Spotify, Apple Music, Amazon Music, YouTube Music), while still supporting Recordings that only exist as a YouTube video — performance footage, TV broadcast rips — with no commercial release at all.

We decided to **link out** (open the platform's own app/website) for Spotify, Apple Music, and Amazon Music, and leave the existing embedded YouTube iframe as it is. Apple Music embedding requires Apple Developer Program enrollment plus a per-user MusicKit authorization flow; Amazon Music's public API is closed-beta/partner-only with no embedding support at all; Spotify's embed degrades to a 30-second preview for most visitors anyway. None of that is worth taking on up front, and it doesn't block embedding a specific platform later — the hard part (matching a Recording to the right URL per platform, and the data model to hold those links) is identical whether the result is a link-out button or an embedded player.

Cross-platform matches are sourced from the free Odesli (song.link) API, which takes one URL and returns the matching links on other platforms. It's only called for Recordings whose Kind is `released` — see [domain-model.md](../domain-model.md) — since a match is fetched once and stored (not re-queried live on every page view) in a new `recording_links` table (`recording_id`, `platform`, `url`) rather than fixed columns on `Recording`, because Odesli already supports more platforms (Tidal, Deezer, etc.) than we're surfacing as first-class right now.

## Considered

Embedding every platform immediately — rejected, since Apple Music alone would require a paid developer account and a real per-user auth flow before anything could ship, and Amazon Music can't be embedded regardless of effort spent.

## Consequences

Recordings created before this decision have no Kind and no Platform Links. There's no backfill migration for this (see [direction/streaming-platform-links.md](../direction/streaming-platform-links.md)) — existing Recordings are classified and matched by hand, one at a time, since there are only a handful.

Odesli is not wired up first. Build order favors a good YouTube search experience first (a single search, with results labeled Music/Video by an "Artist – Topic" channel heuristic, deciding Kind directly), Spotify search as a second source, and Odesli-based expansion to Apple Music/Amazon Music last — see [direction/streaming-platform-links.md](../direction/streaming-platform-links.md) for the phased build order.
