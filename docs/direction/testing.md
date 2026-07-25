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

**Future decision:** whether and when to add component, route, or browser testing. It does not block this focused suite.
