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
Artist reuse across refreshes and roles.

The Clerk/Convex replacement branch expands this strategy at the backend privacy
boundary. It must add fast authorization-contract coverage with Vitest and
`convex-test`, exercising anonymous, owner, other-User, and Site Admin access as
applicable for public queries and mutations. These tests complement rather than
replace the focused pure contracts above and must run through `npm test`.

The replacement must also document and run a small manual smoke with two real
Clerk Development Users against the Convex development environment. Its scope is
the seam the mock backend cannot prove: a Clerk sign-in reaches Convex as the
intended application User, and one User cannot cross another User's private-data
boundary. Playwright, hosted browser CI, broad component testing, and general
browser coverage remain undecided and are not part of the backend replacement.

For the Stage 1 Song slice, the smoke is:

1. Sign in as the owner, confirm the empty/list state loads from Convex, and
   create a Song with a writer credit.
2. Promote that application User to Site Admin through the internal role
   mutation, then make the Song discoverable.
3. Sign in as the second invited User, find and add the discoverable Song, and
   save a private title, note, favorite, and tag.
4. Confirm the second User cannot change the discoverable shared title or
   visibility, and confirm the owner cannot see the second User's private data.
