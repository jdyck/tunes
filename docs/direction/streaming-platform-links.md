# Streaming platform links

Concrete plan for multi-platform Recording playback (see [ADR-0004](../adr/0004-recording-platform-links-via-odesli-link-out.md) for the architectural decision, [domain-model.md](../domain-model.md) for Recording Kind / Platform Link / Platform Preference).

Build order is deliberately phased: get a good YouTube search experience working first, then add Spotify as a second search source, then layer Odesli-based cross-platform expansion on top. Each phase should be usable/iterable on its own rather than waiting for the whole thing.

## Phase 1 (done): YouTube search, one search step

There is no separate YouTube Music search API — Google never published one distinct from the regular YouTube Data API. So this isn't "choose YouTube or YouTube Music, then search twice"; it's **one search** against `search.list`, with results labeled by what they look like:

- Results from an auto-generated **"Artist – Topic" channel** (YouTube/Content ID's marker for officially-delivered audio) get a **Music** badge — detected by `channelTitle` ending in `" - Topic"`, no extra API call needed.
- Everything else gets a **Video** badge.

**The badge on the result the user picks sets `kind`** — Music → `released`, Video → `video_capture` — not a button clicked before searching. Picking a Music-badged result stores both a YouTube link and a YouTube Music link (typically the same video ID, essentially free); picking a Video-badged result stores only the YouTube link.

This replaced the earlier "entry-point button chosen = kind chosen" idea for the YouTube path: a single YouTube search can turn up both kinds of result, so the button you start from can't be what decides `kind`.

Implementation notes, for later phases to build on:

- `search.list` bills a flat 100 quota units per call no matter how many results are requested, and caps `maxResults` at 50 regardless of what's asked for. The add-recording search fetches one page (50 results, 100 units) and defaults to showing only Music-badged ones, with a checkbox to reveal the rest. A "Load next 50 results" button fetches the next page on demand (another 100 units) via YouTube's `pageToken`, merging new results in and de-duping by video ID — YouTube's pagination can return the same video across pages.
- Each result has a thumbnail-click preview (inline YouTube embed) so you can listen before committing, and a separate "+" button to actually select it into the form — selecting is never accidental from a plain click on the row.
- Picking a Music-badged result also attempts to auto-fill `artist` (from the channel name, the "- Topic" suffix stripped), `duration` (from `videos.list` `contentDetails`), and `album`/`year`. The last two come from a useful discovery: label-distributed Topic-channel videos carry an auto-generated description in a semi-standard format (`Provided to YouTube by <distributor>\n\n<title> · <artist>\n\n<album>\n\n℗ ...\n\nReleased on: YYYY-MM-DD`). This isn't an official metadata field — it can be missing or vary on videos that aren't label-distributed — so it's parsed best-effort (`parseYouTubeMusicMetadata` in `src/lib/youtube.ts`) and left blank rather than guessed when the format doesn't match.
- The manual URL field is kept as a fallback alongside search, for videos search can't find. Editing it by hand clears `kind`, since a hand-typed URL can't be trusted to match a stale badge.

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
