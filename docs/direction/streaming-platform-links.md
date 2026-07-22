# Streaming platform links

Concrete plan for multi-platform Recording playback (see [ADR-0004](../adr/0004-recording-platform-links-via-odesli-link-out.md) for the architectural decision, [domain-model.md](../domain-model.md) for Recording Kind / Platform Link / Platform Preference).

Build order is deliberately phased: get a good YouTube search experience working first, then add Spotify as a second search source, then layer Odesli-based cross-platform expansion on top. Each phase should be usable/iterable on its own rather than waiting for the whole thing.

## Phase 1: YouTube sources

Google does not publish a supported YouTube Music catalog API distinct from the YouTube Data API. The app nevertheless offers two search sources in the same Add Recording flow:

- **YouTube Music** uses the unofficial, server-only `ytmusic-api` package and searches both its song and video result kinds. This is the primary catalog-oriented path and can return YouTube Music artist and album identities, names, duration, and the shared YouTube video ID.
- **YouTube** uses the official Data API as a separate search/fallback path. Results from an auto-generated `"Artist – Topic"` channel are normalized to the app's `song` search category; other results are `video`.

Both sources normalize results around the same YouTube video ID and the same local search categories (`song` / `video`), while preserving source provenance that can include either source or both. If evidence is merged for one video ID, `song` wins when either a YouTube Music song or official Topic result supplies catalog-song evidence; otherwise the category is `video`. A `song` is strong evidence for Recording Kind `released` and can support both YouTube and YouTube Music Platform Links because those URLs normally share the video ID. A result categorized as **video** is ambiguous: it may be an officially released music video (`released`) or unofficial footage (`video_capture`). Provider-item category must therefore remain separate from Recording Kind. For a video result, visibly preselect `video_capture` and provide an inline override to `released`; one-tap Add persists the visible selection, and Recording detail remains able to correct it later. This retains the convenient common-case default without silently making the provider category authoritative.

Per [ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md), the video ID and result metadata describe a provider item, not the Recording's identity. `youtube_items` stores the provider snapshot and `recording_youtube_items` associates it to Recordings: one Recording can have multiple items, while a long video can support separate Song-scoped Recordings. A Recording can also carry a MusicBrainz identity and other Platform Links.

### Selected YouTube-item persistence contract

The normalized adapter preserves a snapshot when the User selects a result:

- video ID, accumulated discovery provenance (including manual entry), and normalized `song` / `video` search category;
- title;
- YouTube Music artist ID and name when present;
- YouTube Music album ID and name when present;
- duration; and
- a metadata fetch timestamp.

This is durable source evidence, not an indiscriminate cache. YouTube Music-specific fields are nullable for an item selected only through official YouTube search. Selecting or enriching the same video ID through another source merges into the one snapshot without discarding richer non-null source metadata; `song` evidence wins over `video`, and discovery sources accumulate. Re-running a text search is not identity lookup. Do not store the full raw response, streaming formats, view counts, thumbnail URLs, or other volatile/unneeded values by default. Derive the standard thumbnail URL from the video ID.

Current behavior that later phases build on:

- The official YouTube `search.list` path fetches one page of up to 50 and pages on demand with `pageToken`, merging and de-duplicating by video ID. The unofficial YouTube Music search currently has no pagination in the app.
- Each result has a separate Play preview and Add action, so previewing never selects it accidentally.
- YouTube Music results supply artist identity, duration, and album identity directly when present. The official YouTube path enriches a selected result server-side with `videos.list` title, channel, and duration; provider API credentials never enter the browser bundle.
- The manual URL field is a fallback alongside search for videos search cannot find. Normalize it to the video ID, treat it as category `video`, visibly preselect `video_capture`, and allow the same inline override to `released`. Manual-entry provenance is recorded and YouTube Music-specific fields remain null until later enrichment supplies evidence.

## Phase 2 (later): Spotify as a second search source

Add Spotify's track Search API (client-credentials, no user login needed) as an alternate source alongside YouTube search at the same add-recording step. A selected Spotify track is strong `released` evidence and attaches a Spotify Platform Link directly — no Music/Video labeling needed, unlike YouTube.

## Phase 3 (later still): Odesli-based expansion

Once a Recording exists (via YouTube or Spotify search), feed its `released`-eligible URL to the Odesli API to pick up Apple Music/Amazon Music links (and anything else Odesli matches) automatically, rather than building separate search integrations for those platforms. This is the same "find platform links" edit action described below — it runs regardless of whether the Recording was created via YouTube or Spotify.

## Existing recordings

No backfill script. All current Recordings predate Kind and have no Platform Links. Add a small **"find platform links"** action on the Recording detail page — the Odesli-expand mechanism from Phase 3, exposed as an edit action so an existing Recording can be classified (`kind`) and matched by hand. This doubles as the general re-match mechanism (e.g. retry a Recording that didn't match before, in case Odesli's database has since caught up).

## Open / not yet decided

- Exact UI treatment of the primary vs. secondary platform buttons on the Recording detail page.
- Whether/how a User sets their Platform Preference (ranked list) in the account UI.
