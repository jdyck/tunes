# Verifying changes

Choose checks in proportion to the change. Verification should prove the
contract that changed, not merely show that a command exited successfully.

## Standard code checks

Run the focused test suite for changes to normalization, mapping, provider
matching, authorization, or other behavioral contracts. `npm test` includes
Node's built-in test runner for pure contracts and Vitest/`convex-test` for
Convex authorization behavior:

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

## Maintained contract coverage

Keep these concrete baselines represented in `npm test` when their production
code changes:

- MusicBrainz contracts: partial and ranged dates; Recording candidate order
  and ambiguity; Release Group and representative-edition selection;
  Attribution and Personnel mapping; and album matching by normalized title
  plus duration, including alternate takes, existing-Song-only attachment, and
  refusal of unmatched or ambiguous candidates.
- Artist contracts: provider identity and credited-as handling; membership
  direction, periods, cache behavior, and provider failures; two-User
  Attribution reachability and isolation; distinct Recording counts;
  owner-scoped saved-Recording data; and paged repertoire projections above 500
  Songs/Recordings without omissions or duplicates, including reconciliation
  and readiness behavior.
- Song File contracts: authenticated HTTP actions; anonymous and non-member
  refusal; type, size, and magic-byte validation; owner-only list, delivery,
  and deletion; no Site Admin private-data bypass; private delivery headers;
  storage cleanup; and no storage IDs in public query output.

This list is a discoverability baseline, not an instruction to duplicate test
implementation details here. Extend the nearest focused suite when a listed
contract changes.

## Components and UI

For authenticated local browser checks, follow
[local development access](agents/local-dev-access.md). Use the ordinary dev
account by default and the separate admin account only for admin checks.

Use the dev component gallery under `/dev/components` to exercise shared
components in isolation. When a component changes, verify the states its public
contract permits, including relevant loading, empty, error, disabled, dirty,
saving, and success states. Also inspect the real feature context when layout,
data preparation, focus behavior, or surrounding state affects the result.

Check affected widths and interaction modes rather than relying on a single
desktop screenshot. Preserve existing styling during behavior-preserving
extractions unless redesign is explicitly in scope.

When adding a shared component, register it in `componentRegistry` and add its
matching dev-gallery preview. Preserve the existing call-site styling during an
extraction, remove the replaced markup in the same change, and cover its empty
and relevant loading states with the filled state.

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

For each affected public Convex function or HTTP action, extend the
authorization contract coverage for anonymous, owner, other-User, and Site
Admin identities as applicable.

After changing Clerk/Convex wiring or a private-data delivery boundary, use the
dedicated ordinary and admin development accounts for a small real-session
smoke. Confirm a second User can use the intended shared surface without seeing
the first User's notes, organization, saved Recordings, Song Files, or
admin-only controls.

For Convex deployment-affecting commands, identify and state the exact personal
development, preview, or production target before running them.

## Documentation impact

Before finishing, check whether the change affects domain language,
architecture, reusable contracts, verification procedures, active issues, or
the current project stage. Update the relevant committed docs and, when needed,
the applicable GitHub issue or `local/wip/` handoff as part of the work.
If no documentation needs updating, report:

```text
Docs impact: none.
```
