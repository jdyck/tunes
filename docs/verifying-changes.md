# Verifying changes

Choose checks in proportion to the change. Verification should prove the
contract that changed, not merely show that a command exited successfully.

## Standard code checks

Run the focused tests for changes to normalization, mapping, provider matching,
or other pure contracts:

```bash
npm test
```

Check TypeScript after changing application code or shared types:

```bash
npx tsc --noEmit
```

Run a production build for routing, rendering-boundary, dependency, or broad
integration changes:

```bash
npm run build
```

Record any check that could not be run and why. Do not claim unperformed manual
verification.

## Components and UI

Use the dev component gallery under `/dev/components` to exercise shared
components in isolation. When a component changes, verify the states its public
contract permits, including relevant loading, empty, error, disabled, dirty,
saving, and success states. Also inspect the real feature context when layout,
data preparation, focus behavior, or surrounding state affects the result.

Check affected widths and interaction modes rather than relying on a single
desktop screenshot. Preserve existing styling during behavior-preserving
extractions unless redesign is explicitly in scope.

## Routes and navigation

For browse, pane, modal, or route-bound state changes, cover the relevant parts
of this matrix:

- direct load and refresh;
- client navigation and UI Back actions;
- browser Back and Forward;
- switching between sibling Songs or Recordings;
- mobile, two-pane, and three-pane widths;
- invalid or inaccessible IDs;
- login, logout, and auth redirects;
- dirty-state, scroll, focus, and persistent-player behavior.

Test production builds when Next.js development and production navigation may
differ.

## Backend, auth, and migrations

Read [project-stage.md](project-stage.md) before schema, authorization, auth, or data
migration work. Verification should match both the current operational stage
and the target private-data boundary.

For private tables or policies, use at least two Users and verify that each can
read and mutate their own data without observing or changing the other's data.
For shared canonical entities, separately verify the intended create/edit
authority. For migrations, compare relevant row counts, ownership, nullability,
relationships, and constraints before and after; never infer data preservation
from a successful migration command alone.

For Convex deployment-affecting commands, identify and state the exact personal
development, preview, or production target before running them.

## Documentation impact

Before finishing, check whether the change affects domain language,
architecture, direction, reusable contracts, verification procedures, or the
current project stage. Update the relevant committed docs as part of the work.
If no documentation needs updating, report:

```text
Docs impact: none.
```
