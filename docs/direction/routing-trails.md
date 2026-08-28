# Browse routing trails

Extends [ADR-0010](../adr/0010-responsive-browse-layout-hybrid-parallel-routes.md),
which currently supports exactly one chain: list → Song detail → Recording
detail, with Artist detail as a separate, mutually-exclusive top-level
`@detail` route. This doc scopes a larger set of navigable trails between
Artist, Song, and Recording. A visible trail holds at most one panel of each
entity type; the first entity is reached through its collection panel
(Songs, Artists).

Playlist is a fourth planned entity type in the exhaustive combinations this
was pruned from (see [local/wip/routing-trail-combinations.md](../../local/wip/routing-trail-combinations.md),
not committed) but does not exist in this codebase yet — no schema, no
routes, no panes. Playlist-rooted trails are recorded here for future
reference but are **blocked on the Playlist feature existing at all** and are
out of scope for this doc's implementation work.

## Decision: owner-approved trails

**Unblocked — Artist:**

```text
Artist
Artist > Song
Artist > Song > Recording
```

Artist can go to Songs it wrote, or to a Recording it's on — but only by way
of Song in the URL. There is no direct `Artist > Recording` trail, and Artist
never leads to Playlist.

**Unblocked — Song:**

```text
Song
Song > Artist
Song > Recording
Song > Recording > Artist
```

Song can go to the Artists who wrote it, or to a Recording. Links to a
Recording from Song reset the URL rather than extending the current trail —
this is why `Song > Recording > Artist` is valid but `Song > Artist >
Recording` is not: reaching a Recording from a Song-rooted Artist panel means
picking one of that Artist's other Songs, which starts a fresh `Artist > Song
> Recording` trail rather than extending `Song > Artist`.

**Blocked on Playlist feature — Playlist:**

```text
Playlist > Song
Playlist > Song > Artist
Playlist > Song > Artist > Recording
Playlist > Song > Recording
Playlist > Song > Recording > Artist
```

Playlist can go to Song; there is no bare `Playlist` trail and no direct
`Playlist > Artist` — Artist is only reachable after Song. Not implemented
until Playlist itself is scoped and built.

**Structural constraint, all entities:** Recording can never be the base URL
— it is always reached through Song (bare, or via Playlist once that exists).

## Implemented (Artist/Song/Recording)

The unblocked Artist and Song trails above are built: Artist and Song are now
symmetric stacking roots (each can nest the other, and each nests Recording
one level further in), superseding ADR-0010's "Song or Artist, mutually
exclusive" statement — see [ADR-0011](../adr/0011-symmetric-artist-song-recording-panel-stacking.md).
Panels dismiss LIFO (closing one drops everything nested inside it too,
since each panel's existence is its own URL segment) and the innermost panel
at any 3-deep trail is always an overlay, never a static column — there's no
breakpoint wide enough to fit three fixed-width panels side by side, so the
one furthest from the root always slides in on top instead.

Playlist trails remain blocked on the Playlist feature not existing.
