# Browse routing trails

[ADR-0010](../adr/0010-responsive-browse-layout-hybrid-parallel-routes.md) and
[ADR-0011](../adr/0011-symmetric-artist-song-recording-panel-stacking.md) define
the route architecture. The allowed Artist/Song/Recording trails are:

```text
Artist
Artist > Song
Artist > Song > Recording

Song
Song > Artist
Song > Recording
Song > Recording > Artist
```

Recording is never a root. Every Recording is reached through its Song. A trail
contains at most one panel of each entity type, and closing a panel drops that
panel and everything nested inside it.

## Link-generation rule

Links extend the current trail only when the destination forms one of the
allowed sequences above. In particular, a Song opened under an Artist retains
that Artist root, and the Song's Recording links retain whichever Artist or Song
root already owns the Song panel. Recording Attribution and Personnel links use
`Song > Recording > Artist`. Other entity selections start from their canonical
Artist or Song root rather than inventing an unlisted trail.

The innermost panel in a three-entity trail always overlays the panels behind
it. There is no breakpoint where three fixed-width detail panels become static
columns.

Playlist routing is deferred until Playlist exists; do not preserve speculative
Playlist trails in the current route contract.
