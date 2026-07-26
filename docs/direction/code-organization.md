# Code organization

Standing placement rules (feature folders, lib = effectful / utils = pure) are in [ADR-0006](../adr/0006-components-by-feature-lib-effectful-utils-pure.md); the AGENTS.md repo-layout block mirrors them. This file holds only the open items.

## Move the YouTube Music client out of `utils`

## Rename the match-suggestion pair — opportunistically

`AddRecordingMatchSuggestion` vs `RecordingMatchSuggestion`: the names still do
not communicate the distinction clearly. The former is used while creating a
Recording from Add Recording; the latter is used to match an already-saved
Recording from its detail pane. The MusicBrainz Recording rework has landed,
so the old matching-quality blocker no longer applies. Rename or consolidate
these components only when substantive work next touches both flows; a
standalone rename is not useful.

## Split detail-content controllers — later, opportunistic

`SongDetailContent.tsx` and `RecordingDetailContent.tsx` (~500 lines each) mix data fetching, save/dirty tracking, and rendering. Direction: extract the fetch/save logic into hooks in `src/hooks/` (e.g. `useSongDetail`, `useRecordingDetail`) when next doing substantial work in these files. Not worth a standalone churn-only PR.
