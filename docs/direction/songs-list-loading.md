# How the Songs list loads

The Songs list fetches a User's **whole library in one query** and windows the
*rendering*, growing the visible rows as the User scrolls. It does not paginate
the fetch. This is a deliberate decision, not a missing feature.

## Why the fetch is not paginated

Everything the list does above the rows is computed across every Song the User
has:

- search over the effective title, the shared title, and the writer credit;
- sorting by title, writers, date, or added;
- the tag facet list and its per-tag projected counts;
- the favorites count, the Holiday-exclusion count, and the "N Songs" total.

Holding only one page client-side does not make those partial — it makes them
**wrong**. A tag facet would report "(3)" for a tag on forty Songs.

Moving them server-side is possible but is a real piece of work, not a
`.range()` call, because the sort keys do not exist in the database:
`effectiveSongTitle` resolves a User's private `display_title` over the shared
name, `titleForSorting` strips leading articles and punctuation, and sorting by
writers formats a credit string from nested `song_artist_credits` rows. None of
those are expressible as a PostgREST `.order()`. Server-side paging therefore
needs a view or RPC exposing precomputed sort keys, plus aggregate queries for
the facet counts.

**Revisit when** the single fetch itself becomes slow — not when the row count
merely looks large. At that point move sorting, search, and facet counts to the
server in the same change; a paginated fetch with the current client-side
filtering would ship silently incorrect counts.

## What the list therefore keeps out of its payload

Because the query is unbounded, per-row weight matters. `songListSelect`
(`src/lib/songs.ts`) takes only fields the rows draw. `wikipedia_extract` is
the notable exclusion — a paragraph of prose per Song that only the detail pane
renders, and the single biggest contributor to the payload when it was
included.

`songWithUserDataSelect` remains the fuller detail select. It must keep
`work_date_start` / `work_date_end`: `useSongDetail.save` always writes those
among the shared fields, so a select that omits them loads null and saves null
over whatever the MusicBrainz sync stored.

## Artwork

A Song has no artwork of its own ([ADR-0007](../adr/0007-original-dates-and-albums.md)),
so each row borrows its representative Recording's cover — the same Recording
the Song detail header uses.

This is a **second reactive query** (`useSongArtwork` /
`recordings.listArtworkMine`), not part of the Songs result. The backend starts
from the current User's saved-Recording relationships, selects the first
Recording in that User's order for each Song, and returns only the Release
Group, representative release, and YouTube IDs needed to derive an image. That
keeps the main Song rows small and lets them render as soon as the Songs query
lands, with images filling in afterward.

Artwork failure is deliberately not surfaced in the pane's error state — the
list is fully usable without it, and rows fall back to the placeholder.

Cover art comes from the Cover Art Archive, which 404s often enough that
`RecordingThumbnail` carries a two-slot fallback chain. Combined with render
windowing and `loading="lazy"`, that keeps a large library from firing hundreds
of third-party image requests at once. Keep those three together — dropping the
windowing is what makes the request volume bite.
