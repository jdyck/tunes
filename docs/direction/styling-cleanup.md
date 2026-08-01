# Styling cleanup

The palette decision this file was blocked on has been made. What follows is the
target system and the migration to it.

**The rule: vermillion = things you do, navy = things that are true.**

Every interactive control is vermillion. Every piece of factual information —
composer credits, counts, labels, metadata, section eyebrows — is navy or ink.
Cream and tan are surface. Nothing else is a brand color. Any color on screen
must be explainable by this rule.

## What is actually wrong

Not the token file — `globals.css` already has primitives, semantic aliases, and
scales for spacing, radius, shadow and motion. The problem is that **components
don't consume the semantic layer**. Counted across `src/`:

- ~315 direct *primitive* class usages (`text-ink-*` 131, `line-*` 59, `mojo-*` 38…)
- ~68 *semantic* usages, and 66 of those are just `bg-surface-app` / `bg-surface-sunken`
- `accent-primary` is used **zero** times

The accent rule is already written into `globals.css` and no component obeys it.
Buttons are `bg-slate-700` (`PrimaryButton`), `bg-azure-600`, `bg-slate-800`. So
the work is enforcing the layer boundary at the call sites, not authoring tokens.

Only one literal hex exists outside `globals.css`: the `theme-color` meta tag in
`src/app/layout.tsx`. That one is legitimate — it needs a static value.

## Primitive rename — **unblocked**

Primitive names change to match the design vocabulary. Semantic role names
(`--color-accent-primary`, `--color-surface-app`, …) **do not change**. Keep the
`--color-*` prefix: Tailwind 4 only generates utilities from namespaced tokens.

| Now | Becomes | Notes |
|---|---|---|
| `mojo` | `vermillion` | Keeps all 38 usages. `mojo-600` `#c54226` is the de-facto action color. |
| `orange` | *deleted* | Zero usages. Was `--color-accent-primary`; repoint that at `vermillion`. |
| `azure` | `navy` | `azure-600` `#376091` is the workhorse and already reads as navy. |
| `merino` | `cream` | The real paper family. `-50`/`-100` are page and panel surface. |
| `line` | *folded into* `cream-200` | `line-100` and `line-200` are the same hex (`#D9D0BE`) — a redundancy, not two roles. |
| `old-lace` | *deleted* | Only `-100`/`-200` are used (hover states); the `-400`–`-950` golden ramp is dead. Remap the two live shades onto `cream`. |
| `teal` | *deleted* | All 20 usages are `teal-700` on links and inline actions → vermillion per the rule. |
| `ink` | `ink` | Unchanged. Already warm (`ink-900` = `#201d1b`); no `#000` in the build. |
| `amber` | `amber` | One usage, `--color-status-warning`. Kept as a documented exception — see open decisions. |

Sample final values from the build rather than re-picking from the mockup; the
existing families are coherent and the deltas are small (spec vermillion-500
`#C0392B` vs `mojo-600` `#c54226`; spec navy-500 `#3B5B8C` vs `azure-600`
`#376091`).

### Semantic layer changes

- `--color-accent-primary` → `vermillion` (was `orange`, unused)
- `--color-text-link` → `vermillion` (was `teal-500`; links are actions)
- `--color-focus-ring` → `navy` (was `teal-500`)
- `--color-status-success` → `navy` (was `teal-500`) — success is a thing that is
  true, not a third accent. Green is not remapped to a quieter green; it is gone.
- `--color-accent-secondary` → deleted or repointed at `navy`; it was teal.

## Corrections to earlier notes

Three claims in previous versions of this file, and in the incoming spec, were
wrong and should not be acted on:

- **`bg-old-lace-*` is not a "legacy prefix."** It is a registered `@theme`
  family and `old-lace-50` *is* `--color-surface-app`. It gets deleted because
  its ramp is redundant with `merino`, not because it is legacy debt.
- **There are no default-blue links.** Zero bare `<a>` tags in `src/`;
  navigation is 33 `<Link>`s and `--color-text-link` was already teal. Nothing
  to fix unless a specific screen is identified.
- **The green is not a Spotify layer.** It is 15 usages of Tailwind's *stock*
  green — never added to `@theme` — and every one is success/confirmation
  semantics. It is unchosen default, which is why it looks unrelated to
  everything else.

## Type system — **needs a build check first**

`globals.css` defines `--text-display-*`, `--text-body-*`, `--text-label-*` with
CSS `font` shorthand values (`700 56px/0.95 var(--font-display)`). These have
**zero usages**, and `--text-*` is Tailwind 4's *font-size* namespace, so the
shorthand may be emitting invalid `font-size`. Verify what the build actually
generates before adopting these; if broken, either reshape to Tailwind's
`--text-lg` / `--text-lg--line-height` pairing or move them out of the `--text-*`
namespace and apply via `font:`.

Target roles once the shape is settled: `display` (League Gothic, uppercase
only), `label` (uppercase, letterspaced, navy), `body`, `meta`, `numeric`
(tabular where columnar). Body sans never exceeds ~20px — above that it is
display. Modal and sheet titles use `display`; `Modal.tsx` currently renders its
title as `font-bold` body sans, which is the main reason modals read as a
different application.

## Component work

Component consolidation (button variants, icon button, list row primitive, tag
pill split, modal shell) is tracked in
[component-extraction.md](component-extraction.md) — do not duplicate it here.
Two dependencies run through this file:

- The auth form input + submit button extraction was blocked on this mapping.
  **It is now unblocked.**
- `SaveStatusButton`'s green/vermillion lightning bolts are the app's most
  conspicuous unexplained color. It is already scheduled for deletion in
  `component-extraction.md`; that deletion is the correct fix, not a recolor.

Native controls have no styling story at all: 5 raw `<select>`, 4 raw
`type="checkbox"`, and exactly one `focus-visible` treatment in the entire app
(`Switch.tsx`). Every native control ships with browser default appearance.

## Migration — order matters

1. **Primitive rename + semantic repoint.** Mechanical, `globals.css` plus a
   find-and-replace across call sites. No visual change except where teal,
   green, and slate resolve to new values.
2. **Green and slate purge.** 15 green usages → navy per the rule; 6 slate
   usages → vermillion (`PrimaryButton`) or navy. Highest visual impact per
   unit of effort.
3. **Semantic adoption.** Convert the ~315 primitive call sites to layer-2
   roles, one component or page per commit. Auth pages get converted in the
   same pass their form components are extracted.
4. **Native control replacement.** Checkbox, select, focus ring. Depends on 1–3
   for its colors.

## Do not

- Do not "fix" colors opportunistically while doing other work. Color changes
  happen as part of this migration, not as drive-bys.
- Do not invent new token names or add a primitive family.
- Do not mix layout or spacing changes into a recoloring commit.

## Open decisions

- **Does `status-warning` (amber) survive?** One usage. The two-accent rule has
  no room for it, but a warning that reads as ordinary metadata is arguably a
  bug. Either document it as a deliberate exception alongside `status-danger`,
  or delete it and express warning in words.
- **Does `status-danger` stay its own hex?** Currently `#a83221`, which is
  within touching distance of vermillion. If destructive and primary actions
  look the same, destructive confirmation has to carry the weight.
- **Does the paper texture survive at 3× on mobile,** or does it need a separate
  asset? Not blocking.
