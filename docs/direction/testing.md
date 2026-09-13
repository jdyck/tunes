# Automated tests

`npm test` runs the focused TypeScript suite with Node's built-in test runner.
Keep pure normalization, composed private-data mapping, and provider-matching
contracts covered with reduced local fixtures so regressions do not depend on
live third-party responses.
The MusicBrainz baseline includes partial/range dates, candidate-ordering
invariants, ambiguity preservation, single Release Group display-context
selection, representative-edition selection, and album-import matching by
normalized title plus duration. Album-import fixtures must cover alternate
takes, existing-Song-only attachment, and refusal of unmatched or ambiguous
Song/Recording candidates.
Artist-credit coverage includes provider identity, nullable kind,
credited-as normalization, conflicting-identity protection, and stable local
Artist reuse across refreshes and roles. Artist-browsing coverage includes
two-User Attribution reachability and isolation, distinct Recording counts,
combined Attribution and Personnel reasons on one Recording row, and
owner-scoped saved-Recording payloads. The Artist row's relationship-reason
view model remains a focused pure contract rather than a component-internal
test.

Artist-membership coverage includes both MusicBrainz relationship directions,
separate membership periods, unknown dates, malformed/oversized responses,
cache freshness, and provider failures. Convex tests verify authenticated reads,
admin-only cache writes, source-identity checks, exact-ID local links (including
Artists added after the lookup), plain-text unmatched names, and unchanged
credit reachability and private Artist data.

The Clerk/Convex backend privacy boundary uses fast authorization-contract
coverage with Vitest and `convex-test`. Exercise anonymous, owner, other-User,
and Site Admin access as applicable for every public query and mutation. These
tests complement rather than replace the focused pure contracts above and run
through `npm test`.

Song File coverage also exercises the authenticated Convex HTTP actions:
anonymous and non-member uploads, type/size/magic-byte validation, owner-only
list/delivery/delete behavior, Site Admin non-bypass behavior, private delivery
headers, storage deletion, and the absence of storage IDs from public query
output. Mocked identities cannot prove the real Clerk-to-Convex token seam, so
the adoption verification included a manual smoke with two real Clerk
Development Users: the second User discovered and added the owner's shared Song
without seeing the owner's favorite, notes, Recordings, or Site Admin controls.
Repeat this small two-account smoke after changes to authentication wiring or a
private-data boundary, including Song File HTTP actions, and verify the
development deployment's exact `APP_ORIGIN` CORS value. Keep browser automation,
hosted browser CI, broad component testing, and general browser coverage as
separate decisions.

Repeatable local agent sessions use the dedicated development accounts in
[local development access](../agents/local-dev-access.md), with isolated private
fixture notes and separate ordinary/admin roles. This uses real Clerk sessions
without changing the application authentication path. Guard and seed tests cover
production refusal, missing/mismatched private environment configuration, pinned
account identity, rejection of Clerk fixed-code test addresses, local redirects,
replacement-ticket revocation and cleanup, fixture idempotence after email-less
sessions, private data isolation, and admin boundaries.
