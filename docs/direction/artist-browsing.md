# Artist browsing

The Artists destination follows the Songs-pane pattern: a searchable, sortable
list on the left and the selected Artist in the parallel detail pane. It brings
together Songs on which the Artist has a writer credit, saved Recordings on
which the Artist has a structured Recording Attribution, Release Group
Attribution, or Personnel credit.
Artist kind and a direct MusicBrainz link appear when that canonical metadata
is available.

## Remaining detail enrichment

- Add User-specific editable tags and personal notes backed only by
  `artist_user_data`.
- If a suitable metadata source can be matched reliably, add a short shared
  canonical biographical/background section. Prefer the existing
  MusicBrainz/Wikipedia integration patterns over introducing a new provider,
  keep sourced biography separate from User-specific personal notes, and make
  an absent or unmatched biography an ordinary state.

## Data model: credited identity lives in `artists`

Per [ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md), Artist is the shared, provider-neutral identity for anything that can receive a musical credit. It is deliberately broader than Person and may carry a kind such as person, group, orchestra, choir, character, or other. Kind remains null when unknown; do not turn missing source data into `other`. MusicBrainz Artist IDs attach to this identity rather than defining it.

The schema exposes `artists` as the single shared canonical identity, private
notes/tags in `artistUserData` (at most one row per User/Artist), and
role-bearing `songArtistCredits`, grouped `recordingPersonnel`, plus
identity-bearing `recordingArtistAttributions` and
`releaseGroupArtistAttributions`. Build browsing on those Artist-backed
surfaces; do not reintroduce a separate Person identity for Song writers.

The product distinguishes a Recording's structured Attribution from its
structured Personnel relationships. Both use the same canonical Artist
identities, but Attribution preserves ordered credited-as names and exact join
phrases while Personnel describes evidenced contributions. A transitional
Attribution Fallback may display unresolved legacy, manual, or provider text
when no structured Attribution exists; it never creates an Artist-browsing
relationship. Do not infer group members or performers from either the
Attribution or its fallback. A group credit does not stand in for its members;
both can be represented when the evidence supports both relationships.

Artist detail presents each reachable saved Recording as its own row rather
than one row per relationship. The row identifies every applicable path:
Recording Attribution, Release Group Attribution, and/or Personnel. A
Release Group path is labeled as an album credit with the Release Group title;
it never implies Song authorship or a performance relationship. The
Artists-list Recording count likewise counts distinct saved Recordings across
all three paths, not relationship rows. No Release Group detail page is needed
for this navigation.

The Artists pane lists all Artist kinds rather than silently filtering out
groups. Kind can be shown only when useful for disambiguation or filtering; it
does not need to clutter every row. Compositions come from Song-to-Artist
credits whose role is composer, lyricist, or writer. Recordings come from
structured Recording Attribution, Release Group Attribution, and Personnel
credits.

Convex composes this User-specific browsing view on the backend. `artists:listMine`
counts each Artist once per owned Song and once per saved Recording, even when
several structured credit paths point to the same Artist. `artists:getMine`
begins Recording traversal with the current User's saved-recording memberships,
then follows the Recording's Release Group when present. It returns the
canonical identity together with only the current User's Songs, saved
Recordings (including their relationship reasons and Release Group title),
Recording Song titles, and optional private Artist row. React does not rebuild
these joins from unrelated global queries.

Recording Personnel is populated when a User confirms or explicitly refreshes
a MusicBrainz Recording match. It groups instrument, vocal, conductor,
orchestra, and generic performer evidence by canonical Artist; Artist browsing
follows that grouped relationship once per saved Recording regardless of how
many contribution details it contains. Its absence remains an ordinary empty
state rather than an error; never infer Personnel from Attribution or fallback
text.

Artist detail resolves an identity-backed image on first view through the
stored MusicBrainz Artist ID, its Wikidata relationship, and Wikidata's
Wikimedia Commons image. The shared Artist row caches both successful image
metadata and a completed lookup with no result, so an ordinary miss is not
retried on every view. Transient provider failures remain uncached. Never fall
back to a name-based image search; a missing MusicBrainz identity or verified
Commons image uses the ordinary no-image state.

The Clerk-protected Next.js Artist-image route remains the upstream boundary.
It reads the Artist through Convex, resolves the identity-backed metadata, and
uses an admin-authorized, URL-constrained Convex mutation to cache the shared
result. This is sufficient for the current sole-owner trusted stage; revisit
the cache-writer capability before non-admin Artist browsing becomes a launch
requirement.

Because the pane combines shared canonical facts with private `artistUserData`,
saving notes/tags must never issue a broad update to the canonical Artist row.
The write policy for editing shared Artist metadata is a separate migration
concern; see [canonical-entity-migrations.md](canonical-entity-migrations.md).
