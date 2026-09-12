# Music player

The app uses one persistent YouTube IFrame player. Other services are link-out
destinations governed by
[streaming-platform-links.md](streaming-platform-links.md) and
[ADR-0004](../adr/0004-recording-platform-links-via-odesli-link-out.md), not
additional embedded players.

## Current contract

- `GlobalPlayer` lives in the root layout, survives navigation, and owns the
  active `Playable`, transport state, progress, and video visibility.
- Saved Recordings and unsaved search results use the same provider-oriented
  `Playable` contract. Recording Kind chooses the initial visible-video state;
  the User can override it without interrupting playback.
- The IFrame target keeps a constant size class because the YouTube API copies
  target classes only when it creates the IFrame. Visibility and resizing belong
  on its parent.
- Hidden video stays normal-sized and positioned off-screen. Shrinking it to a
  negligible box can trigger browser auto-pause behavior.

## Open work

- Make Play/Pause derive only from confirmed YouTube state. On iPhone, changing
  from a saved Recording to a search-result preview can currently show Pause
  even though the new video did not start.
- Add a genuinely compact state and a richer expanded state. Preserve the
  effective Song title, Recording Attribution, artwork/Release Group context,
  and structured Artist links where available.
- Retain an unsaved preview's source Song so the player can offer one-tap Save;
  saved Recordings should instead offer navigation back to their detail pane.
- Decide queue/next behavior. Random selection from saved playable Recordings is
  sufficient for a first version.
- The bottom bar remains functional scaffolding pending the owner's visual pass.

## Capability boundary

The YouTube IFrame cannot promise playback after the browser is backgrounded,
the screen locks, or navigation enters another app. YouTube APIs do not provide
extractable audio streams; do not use unofficial media URLs. Background audio
would require a separately scoped native or licensed playback source.
