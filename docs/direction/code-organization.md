# Code organization

Standing placement rules (feature folders, lib = effectful / utils = pure) are in [ADR-0006](../adr/0006-components-by-feature-lib-effectful-utils-pure.md); the AGENTS.md repo-layout block mirrors them. This file holds only the open items.

## Rename the match-suggestion pair — opportunistically

`AddRecordingMatchSuggestion` vs `RecordingMatchSuggestion`: the names still do
not communicate the distinction clearly. The former is used while creating a
Recording from Add Recording; the latter is used to match an already-saved
Recording from its detail pane. The MusicBrainz Recording rework has landed,
so the old matching-quality blocker no longer applies. Rename or consolidate
these components only when substantive work next touches both flows; a
standalone rename is not useful.

## Split Recording detail controller — later, opportunistic

`useRecordingDetail` now owns Recording loading plus its typed draft and
revision-safe save lifecycle. `RecordingDetailContent.tsx` still owns
Song-context loading, MusicBrainz matching, deletion, and their transient
states. Move those remaining effectful workflows into the existing hook when
substantive work next touches them; do not turn the hook into a bag of purely
presentational toggles. Song detail already uses `useSongDetail` for its
fetch/save orchestration.
