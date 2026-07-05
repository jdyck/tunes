# Better music player

Superseded in part by [streaming-platform-links.md](streaming-platform-links.md) / [ADR-0004](../adr/0004-recording-platform-links-via-odesli-link-out.md): Spotify/Apple Music/Amazon Music will be link-out, not embedded, so this doc only concerns the YouTube embed itself. Embedding a non-YouTube platform (Spotify is the only realistic near-term candidate) is future work, not scoped yet.

## Implemented

A persistent custom player replaced the old per-page bare YouTube embeds. `src/components/YouTubePlayer.tsx` (an earlier, unused wrapper around the IFrame API) is now dead code, superseded by this.

- **`src/components/GlobalPlayer.tsx`** — a client component rendered in the root layout (`src/app/layout.tsx`), wrapping `{children}`. It owns all playback state (current track, playing/paused, progress, video visibility) and drives a single YouTube IFrame API player instance. Because it lives in the layout rather than a page, Next.js keeps it mounted across route navigations — playback survives moving between screens instead of restarting per page.
- **`usePlayer()`** hook, exported from the same file, is how any page starts playback: `usePlayer().play(playable)`. `play` takes a `Playable` (`{ name, url?, artist?, kind? }`) rather than a full `Recording`, since YouTube search results (not yet saved as a Recording) need to play too, alongside saved Recordings which structurally satisfy `Playable`.
- **Custom controls, hidden video by default.** The IFrame API still plays a real video (YouTube exposes no audio-only stream), but the app shows its own play/pause, scrubber, and time instead of YouTube's chrome. `Recording.kind` decides the starting state — `released` starts audio-only (video hidden off-screen), `video_capture` starts with video shown — and a chevron button lets the user override either way at any time without interrupting playback.
- **Wired in at three call sites:** the recording detail page (`src/app/recording/[id]/page.tsx`, a "Play" button replacing the old inline iframe), the tune detail page's recordings list (`src/app/tune/[id]/page.tsx`, a play button per row, `stopPropagation`'d so it doesn't also trigger the row's link-through), and the add-recording YouTube search results (`src/app/tune/[id]/add-recording/page.tsx`, clicking a result's thumbnail plays it as a `Playable` built from the search result — this replaced a separate inline per-result preview iframe that used to exist only in that one screen).

Two non-obvious pitfalls hit during implementation, worth knowing before touching this component again:

- The YouTube IFrame API copies whatever CSS class the target `<div>` has *once, at creation time*, onto the `<iframe>` it generates, and never again — so the div handed to `new YT.Player(...)` must keep a **constant** className (`w-full h-full`) forever. All show/hide and resize logic instead happens on that div's *parent*, whose size the iframe fills via percentage sizing (recalculated on every layout, unlike the frozen class).
- Shrinking the hidden-video container down to ~1x1px (to visually hide it while it keeps playing) causes some browsers to auto-pause it, apparently treating it as an offscreen/negligible element. The fix was to keep it a normal size (`w-80 aspect-video`) but positioned off-screen (`-left-[9999px]`) instead of shrinking it — same visual result, no pause.

## Known follow-up

The owner plans to redesign the bottom bar's visual treatment separately — current styling is functional scaffolding, not final. Don't restyle it unprompted.

## Open / not yet decided

- Whether queueing/next-track behavior is in scope here or a separate feature.
- Whether `src/components/YouTubePlayer.tsx` should just be deleted now that it's confirmed dead code, or left as-is until a broader cleanup pass.
