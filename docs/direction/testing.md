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

The Clerk/Convex backend privacy boundary uses fast authorization-contract
coverage with Vitest and `convex-test`. Exercise anonymous, owner, other-User,
and Site Admin access as applicable for every public query and mutation. These
tests complement rather than replace the focused pure contracts above and run
through `npm test`.

Mocked identities cannot prove the real Clerk-to-Convex token seam. The adoption
verification therefore included a manual smoke with two real Clerk Development
Users: the second User discovered and added the owner's shared Song without
seeing the owner's favorite, notes, Recordings, or Site Admin controls. Repeat a
small two-account smoke when authentication wiring or a private-data boundary
changes, and before the project enters privacy-active use. Keep browser
automation, hosted browser CI, broad component testing, and general browser
coverage as separate decisions.
