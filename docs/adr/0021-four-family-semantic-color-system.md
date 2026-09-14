# Four-family semantic color system

The design system has four primitive color families only: `vermillion`,
`azure`, `ink`, and `paper`. Components should consume semantic `--color-*`
roles rather than treating primitive palette utilities as their public styling
API: actions are vermillion, factual content is azure or ink, and paper is
surface. Existing primitive use is migration debt.
Links and success states are azure; white and black remain deliberate literals
for text on filled controls, the modal scrim, and video letterboxing.

Bare icon controls repeated in a row are the narrow exception: they are ink at
rest and vermillion on hover to avoid a field of competing accents. A filled or
prominent standalone control remains vermillion at rest. The static browser
`theme-color` must match the app surface token; semantic-token adoption is a
separate incremental migration, not a reason to recolor unrelated work.
