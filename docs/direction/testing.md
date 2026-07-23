# Automated tests

`npm test` runs the focused TypeScript suite with Node's built-in test runner.
Keep pure normalization and provider-matching contracts covered with reduced
local fixtures so regressions do not depend on live third-party responses.
The MusicBrainz baseline includes partial/range dates, candidate-ordering
invariants, ambiguity preservation, and separate Original Release, Primary
Release, and representative-edition selection.

**Future decision:** whether and when to add component, route, or browser testing. It does not block this focused suite.
