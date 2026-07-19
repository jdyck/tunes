# Better music player

Superseded in part by [streaming-platform-links.md](streaming-platform-links.md) / [ADR-0004](../adr/0004-recording-platform-links-via-odesli-link-out.md): Spotify/Apple Music/Amazon Music will be link-out, not embedded, so this doc only concerns the YouTube embed itself. Embedding a non-YouTube platform (Spotify is the only realistic near-term candidate) is future work, not scoped yet.

## Implemented

A persistent custom player replaced the old per-page bare YouTube embeds. (`YouTubePlayer.tsx`, an earlier unused wrapper this superseded, has since been deleted.)

- **`src/components/player/GlobalPlayer.tsx`** — a client component rendered in the root layout (`src/app/layout.tsx`), wrapping `{children}`. It owns all playback state (current track, playing/paused, progress, video visibility) and drives a single YouTube IFrame API player instance. Because it lives in the layout rather than a page, Next.js keeps it mounted across route navigations — playback survives moving between screens instead of restarting per page.
- **`usePlayer()`** hook, exported from the same file, is how any page starts playback: `usePlayer().play(playable)`. `play` takes a `Playable` (`{ name, url?, artist?, kind? }`) rather than a full `Recording`, since YouTube search results (not yet saved as a Recording) need to play too, alongside saved Recordings which structurally satisfy `Playable`.
- **Custom controls, hidden video by default.** The IFrame API still plays a real video (YouTube exposes no audio-only stream), but the app shows its own play/pause, scrubber, and time instead of YouTube's chrome. `Recording.kind` decides the starting state — `released` starts audio-only (video hidden off-screen), `video_capture` starts with video shown — and a chevron button lets the user override either way at any time without interrupting playback.
- **Wired in at three call sites** (paths as of the July 2026 reorg): the recording detail content (`src/components/recording/RecordingDetailContent.tsx`, a "Play" button replacing the old inline iframe), the song detail's recordings list (`src/components/song/SongDetailContent.tsx`, a play button per row, `stopPropagation`'d so it doesn't also trigger the row's link-through), and the add-recording YouTube search results (`src/components/recording/AddRecordingModal.tsx`, clicking a result's thumbnail plays it as a `Playable` built from the search result — this replaced a separate inline per-result preview iframe that used to exist only in that one screen).

Two non-obvious pitfalls hit during implementation, worth knowing before touching this component again:

- The YouTube IFrame API copies whatever CSS class the target `<div>` has *once, at creation time*, onto the `<iframe>` it generates, and never again — so the div handed to `new YT.Player(...)` must keep a **constant** className (`w-full h-full`) forever. All show/hide and resize logic instead happens on that div's *parent*, whose size the iframe fills via percentage sizing (recalculated on every layout, unlike the frozen class).
- Shrinking the hidden-video container down to ~1x1px (to visually hide it while it keeps playing) causes some browsers to auto-pause it, apparently treating it as an offscreen/negligible element. The fix was to keep it a normal size (`w-80 aspect-video`) but positioned off-screen (`-left-[9999px]`) instead of shrinking it — same visual result, no pause.

## Known follow-up

The owner plans to redesign the bottom bar's visual treatment separately — current styling is functional scaffolding, not final. Don't restyle it unprompted. The requirements are still open, but explore:

- When the active `Playable` is a YouTube search result rather than a saved Recording, offer an obvious path to add it to the Song's Recordings.
- When the user navigates away from the active Recording/Song, give them a control that returns them to that item's detail pane.
- Provide a genuinely compact/minified player state, not just the existing optional cover-art/video visibility. Its always-visible controls are play/pause, Song name, artist, an expand control, and a minimal line progress bar. The expanded state adds artwork, album, a next button that selects a random playable Recording, a link to the artist, and a contextual action: go to the Recording if it has been saved, or add it if it has not. An unsaved preview must retain the Song it originated from; Add attaches the Recording directly to that Song — the same immediate one-tap add as in [add-recording-modal.md](add-recording-modal.md), with no modal reopening or MusicBrainz confirmation step in between.
- When no track is active, consider replacing inactive transport controls with a random-play action. Initially choose uniformly from saved playable Recordings; more sophisticated Song-first or preference-aware selection can wait.

### iPhone preview controls can fall out of sync

On iPhone, the preview control in the Add Recording modal does not reliably reflect the actual YouTube player state. Reproduction: play a saved Recording, open the Add Recording modal, then tap Play on a different search result. The new video does not begin playback, but its Play button disappears and a Pause button is shown. Tapping Pause does nothing. Playback can only be recovered by closing the Global Player and tapping Play again, or by revealing the hidden YouTube video and using its native Play control.

Investigate the player lifecycle, the handoff from the active Recording to the preview, autoplay/user-gesture handling, and iOS YouTube IFrame state events. Do not update the UI optimistically to playing merely because a play request was issued: the control must derive from confirmed authoritative player state. A failed or blocked transition must remain/revert to an actionable Play control, and a playing preview must present Pause, without requiring the recovery steps above.

### Background playback is not a capability of the current embed

The player is a YouTube IFrame running inside a web page, so it cannot promise continued playback after the browser/app is backgrounded, the screen is locked, or navigation moves into another app's in-app browser. Background playback for YouTube music is controlled by YouTube and the host iOS environment, not by this application's player code. Treat it as unavailable in the web app; a future native-player/product approach would need to be scoped separately and must use a playback source whose terms and platform integration permit background audio.

YouTube Music does not offer a public API that supplies playable audio/media files to this app. The supported web playback integration is YouTube's embedded IFrame Player; the Data API can provide discovery metadata and video IDs, not stream URLs. Do not extract YouTube/YouTube Music media URLs or rely on unofficial APIs to build an audio-only player. If background audio becomes a product requirement, investigate a licensed provider with an official playback SDK/API rather than treating YouTube as the media source.

If that requirement is revisited, the viable directions are: Apple Music via MusicKit (the user authorizes their own Apple Music subscription; strongest fit if the product becomes a native iOS app), Spotify's Web Playback SDK (the user needs Spotify Premium; its platform terms and mobile-browser constraints need review), or a business licensing service such as Feed.fm (licensed catalog and native SDKs, but primarily curated/radio-style playback rather than a guarantee that a particular Recording can be played on demand). Directly licensing each desired recording from rights holders is also possible in principle, but is a separate commercial, rights-management, and delivery undertaking. Do not select a provider without first deciding whether the product needs user-selected full tracks, background/lock-screen playback, and a native iOS client.

## Open / not yet decided

- Whether queueing/next-track behavior is in scope here or a separate feature.
