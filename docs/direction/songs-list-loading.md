# Song list loading

`songs.listMine` returns the current User's whole Song library in one reactive
query, bounded at 2,000 memberships. The client searches, sorts, and filters that
complete result, then windows row rendering as the User scrolls. It does not
paginate the fetch.

This keeps title/writer search, every sort mode, tag facets, favorites, Holiday
exclusion, and total counts correct across the library. Client-side pagination
would make those results partial. Revisit the contract only when the fetch itself
becomes slow; server paging must move search, sort keys, and facet aggregates to
the backend together.

## Artwork

A Song has no artwork of its own
([ADR-0007](../adr/0007-original-dates-and-albums.md)).
`recordings.listArtworkMine` separately returns the current User's representative
saved Recording artwork for each Song. Song rows can therefore render before
artwork arrives and fall back to a placeholder if it fails.

Keep the separate artwork query, render windowing, image lazy loading, and the
`RecordingThumbnail` fallback chain together; removing the window would trigger
hundreds of third-party Cover Art Archive requests for a large library.
