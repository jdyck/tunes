# Private Artist repertoire projection

## Decision

Artist browsing reads a private, owner-scoped projection instead of joining a
User's entire Song and saved-Recording repertoire at query time. Canonical
Songs, Recordings, Release Groups, Artists, and their credit tables remain the
source of truth; the projection is a rebuildable read model and never grants
access by itself.

The projection has three private tables:

- `artistRepertoireSummaries` stores one User/Artist row with distinct Song and
  saved-Recording counts;
- `artistSongRepertoireEntries` stores one User/Artist/Song relationship; and
- `artistRecordingRepertoireEntries` stores one
  User/Artist/Recording relationship, its Song, and every applicable
  Attribution, Release Group Attribution, and Personnel reason.

Current-User membership writes update the relevant source projection in the
same mutation. Shared writer, Recording, Personnel, Attribution, and Release
Group changes also enqueue source-keyed work in
`artistRepertoireReconciliationJobs`. Internal mutations process that durable
work in bounded batches and schedule continuations. Repeating a projection or
restarting work is idempotent.

Artist summaries and detail entries are cursor-paged. The Artists list loads
all summary pages before applying its existing global client-side search and
sort behavior. Artist detail hydrates only the selected Artist's current Song
or Recording page; its full counts come from the summary row.

During rollout, an optional `users.artistRepertoireProjectedAt` readiness
marker keeps an existing User on the former bounded live read until backfill
and verification succeed. New Users begin ready because they have no legacy
memberships, and all of their writes maintain the projection. The final
migration step sets the marker for existing Users; the temporary legacy branch
can be removed after production verification.

## Why

The previous Artist list and detail queries traversed every private Song and
saved Recording and then followed shared credits. Besides exceeding the
deliberate 500-source guard, that work grew with a User's entire repertoire on
every read. Owner-scoped projection rows make list work proportional to the
number of reachable Artists and detail work proportional to one requested
page, while preserving the canonical/private split.

Storing one row per distinct source relationship prevents multiple roles or
credit paths from inflating counts. Keeping the User ID on every projection
row makes the privacy boundary explicit and indexable instead of relying on a
later in-memory filter.

## Consequences

Every source write path must invoke the shared projector or enqueue bounded
reconciliation work. A direct write that bypasses those helpers can make the
read model stale and is a correctness bug.

The editing User sees synchronous projection updates. Other Users can briefly
see the prior derived result after a shared-credit edit, but the queued work
contains only source identifiers and processes each User's membership without
returning private data to the editor.

Existing data requires the additive, idempotent
`migrations:runArtistRepertoireProjection` backfill and verification series.
The legacy-read bridge makes it safe to deploy the additive schema, writers,
and migration functions before running that series; projection reads activate
only in its final step. Rehearse it on a snapshot-seeded preview and verify with
two Users before obtaining separate approval for a production run. The
migration does not delete canonical or private source data.
