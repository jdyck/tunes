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

## Split Recording detail controller — later, opportunistic

`RecordingDetailContent.tsx` still mixes data fetching, save/dirty tracking, and
rendering. Extract that orchestration into a hook in `src/hooks/` (for example,
`useRecordingDetail`) when next doing substantial work in this file. Not worth
a standalone churn-only change. Song detail already uses `useSongDetail` for
its fetch/save orchestration.
