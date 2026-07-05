# Streaming platform links

Concrete plan for multi-platform Recording playback (see [ADR-0004](../adr/0004-recording-platform-links-via-odesli-link-out.md) for the architectural decision, [domain-model.md](../domain-model.md) for Recording Kind / Platform Link / Platform Preference).

Build order is deliberately phased: get a good YouTube search experience working first, then add Spotify as a second search source, then layer Odesli-based cross-platform expansion on top. Each phase should be usable/iterable on its own rather than waiting for the whole thing.

## Phase 1 (build now): YouTube search, one search step

There is no separate YouTube Music search API — Google never published one distinct from the regular YouTube Data API. So this isn't "choose YouTube or YouTube Music, then search twice"; it's **one search** against the existing `search.list` endpoint, with results labeled by what they look like:

- Results from an auto-generated **"Artist – Topic" channel** (YouTube/Content ID's marker for officially-delivered audio) get a **Music** badge.
- Everything else gets a **Video** badge.

**The badge on the result the user picks sets `kind`** — Music → `released`, Video → `video_capture` — not a button clicked before searching. Picking a Music-badged result stores both a YouTube link and a YouTube Music link (typically the same video ID, essentially free); picking a Video-badged result stores only the YouTube link.

This replaces the earlier "entry-point button chosen = kind chosen" idea for the YouTube path: a single YouTube search can turn up both kinds of result, so the button you start from can't be what decides `kind`.

## Phase 2 (later): Spotify as a second search source

Add Spotify's catalog Search API (client-credentials, no user login needed) as an alternate source alongside YouTube search at the same add-recording step. Any Spotify result is inherently `released` (Spotify's whole catalog is official releases) and attaches a Spotify Platform Link directly — no Music/Video labeling needed, unlike YouTube.

## Phase 3 (later still): Odesli-based expansion

Once a Recording exists (via YouTube or Spotify search), feed its `released`-eligible URL to the Odesli API to pick up Apple Music/Amazon Music links (and anything else Odesli matches) automatically, rather than building separate search integrations for those platforms. This is the same "find platform links" edit action described below — it runs regardless of whether the Recording was created via YouTube or Spotify.

## Existing recordings

No backfill script. All current Recordings predate Kind and have no Platform Links. Add a small **"find platform links"** action on the Recording detail page — the Odesli-expand mechanism from Phase 3, exposed as an edit action so an existing Recording can be classified (`kind`) and matched by hand. This doubles as the general re-match mechanism (e.g. retry a Recording that didn't match before, in case Odesli's database has since caught up).

## Open / not yet decided

- Exact UI treatment of the primary vs. secondary platform buttons on the Recording detail page.
- Whether/how a User sets their Platform Preference (ranked list) in the account UI.
- Whether the "Artist – Topic" channel heuristic needs a manual override in the UI (in case it mislabels a result), or whether mislabeling is rare enough to defer.
