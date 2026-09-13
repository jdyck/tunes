# Symmetric Artist/Song/Recording panel stacking

## Decision

Artist and Song are now both stacking roots in the `@detail` slot, each able
to nest the other, with Recording nestable one level further under whichever
of the two is currently the root:

```
Artist > Song > Recording
Song > Artist            (terminal — does not extend to Recording)
Song > Recording > Artist
```

This supersedes the "Song or Artist, mutually exclusive" statement in
[ADR-0010](0010-responsive-browse-layout-hybrid-parallel-routes.md). Every
other statement in ADR-0010 — pathname gates over trusting slot resolution,
duplicate resolver files per active slot at each URL depth, Song and
Recording (now also Artist) able to be mounted simultaneously — still holds
and is now used symmetrically for both roots.

Panel dismissal is strictly LIFO: closing a panel always drops everything
nested inside it too, because each panel's existence is its own URL segment
(there is no way to encode "inner panel open, outer one closed" as a URL). A
shared `NestedPaneGate` component (`src/components/layout/NestedPaneGate.tsx`)
computes its own close target as the current pathname truncated right before
its own matched segment, rather than taking `backHref` as a prop — this keeps
dismissal correct even though the same slot (e.g. Song's own nested Artist
slot) is reachable at more than one depth.

A slot that can only ever be the immediate second panel (Recording directly
under Song; Song directly under Artist) still collapses into a static
in-flow column at the `2xl` breakpoint, exactly as Recording already did. A
slot that can also be reached one level deeper (Artist under Song, since
that's also reachable as `Song > Recording > Artist`; Recording under Artist,
always 3 deep) never goes static — it stays a fixed/absolute overlay at every
width. Three fixed-width panels don't fit in one flex row at any breakpoint,
so the innermost panel always overlays the ones behind it instead of trying
to claim a fourth static column.

## Why

The owner wanted writer credits, recording personnel, and release-group
attribution to open their linked Artist without losing the Song or Recording
context that got you there, and wanted the reverse (browsing an Artist's
Songs and Recordings) to keep the Artist panel open too — see
[routing-trails.md](../direction/routing-trails.md) for the full approved
trail set. Making only one of Artist/Song a stacking root (the other always
replacing on navigate) was considered and rejected: it would have made the
two directions behave inconsistently for no reason the owner asked for.

## Consequences

Every outbound link that already carried an `artistId`, `songId`, or
`recordingId` (writer credits, personnel, attribution, the Recordings list
within a Song, the Songs/Recordings lists within an Artist) needed its href
changed to the appropriate nested or root-anchored form; none needed new data
threaded in, since the ids were already present at each call site.

Extending a trail versus resetting to a fresh one turns out to produce the
same href in every case except one (a Song's own outbound Recording links,
which must extend using whichever root — Song or Artist — is currently
active). Every other outbound link direction is anchored purely to its own
entity's id, with the correct extend/reset behavior falling out for free: see
routing-trails.md's "Link-generation rule" for the case-by-case reasoning.

The route tree roughly doubles in file count (Artist's `@song`/`@recording`
slots mirror Song's existing `@recording` slot, plus one more slot each for
the newly-added Artist-under-Song and Song-under-Artist direction) — this is
the Next.js parallel-route mechanics ADR-0010 already established (a stub
resolver per active slot at every URL depth where that slot is reachable),
not a new pattern.

Playlist does not exist in this codebase; its routing remains out of scope for
this decision.
