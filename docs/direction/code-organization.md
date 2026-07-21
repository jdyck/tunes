# Code organization

Standing placement rules (feature folders, lib = effectful / utils = pure) are in [ADR-0006](../adr/0006-components-by-feature-lib-effectful-utils-pure.md); the AGENTS.md repo-layout block mirrors them. This file holds only the open items.

## Move the YouTube Music client out of `utils`

`src/utils/ytmusic.ts` now initializes and retains a `ytmusic-api` client, performs network requests, and enforces timeouts. It is effectful/stateful and therefore violates the settled lib/utils boundary. Move it to `src/lib/` when implementing the `youtube_items` provider-snapshot work in [streaming-platform-links.md](streaming-platform-links.md), updating imports and its stale file-header comment in the same change. Do not treat its current location as precedent for another provider client under `utils`.

## Rename the match-suggestion pair — deferred deliberately

`AddRecordingMatchSuggestion` vs `RecordingMatchSuggestion`: the names don't communicate the distinction (one is used inside `AddRecordingModal`). The whole matching area needs functional rework first — MusicBrainz match quality is poor with the data available — and the naming will be settled as part of that rework, when the concepts are clearer. Do not rename these two components before then.

## Split detail-content controllers — later, opportunistic

`SongDetailContent.tsx` and `RecordingDetailContent.tsx` (~500 lines each) mix data fetching, save/dirty tracking, and rendering. Direction: extract the fetch/save logic into hooks in `src/hooks/` (e.g. `useSongDetail`, `useRecordingDetail`) when next doing substantial work in these files. Not worth a standalone churn-only PR.
