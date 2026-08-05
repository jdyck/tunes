# Styling cleanup

The palette is settled and the families are final. What follows is the rule and
the migration that remains.

**The rule: vermillion = things you do, azure = things that are true.**

Every interactive control is vermillion. Every piece of factual information —
composer credits, counts, labels, metadata, section eyebrows — is azure or ink.
Paper is surface. Nothing else is a brand colour. Any colour on screen must be
explainable by this rule.

Four families, and no more: **`vermillion`, `azure`, `ink`, `paper`.** Earlier
drafts of this file planned to rename `azure` to `navy`; that is **not
happening** — the family stays `azure`. Do not reintroduce the rename, and read
"navy" in any older note as meaning `azure`. `white` and `black` survive as
literals for button text, the modal scrim, and video letterboxing.

**Icon controls in repeating rows are the exception: ink at rest, vermillion on
hover.** A row of naked glyphs — play, arrow, drag handle — reads as clutter
when every one of them shouts in accent colour, and that clutter multiplies down
a list. They are still "things you do", so vermillion is what they resolve to on
interaction; they just don't wear it at rest. `RecordingsSection.tsx` is the
reference implementation.

The exception is specifically about repetition. It does **not** apply to a
control with a filled container (which stays vermillion throughout), nor to a
lone prominent icon control like the player's transport button, which is
vermillion at rest.

## What is actually wrong

Not the token file — `globals.css` already has primitives, semantic aliases, and
scales for spacing, radius, shadow and motion. The problem is that **components
don't consume the semantic layer**. Counted across `src/`:

- ~300 direct *primitive* class usages (`text-ink-*` ~127, `paper-*` ~105, `vermillion-*` ~37…)
- ~80 *semantic* usages, still mostly `bg-surface-app` / `bg-surface-sunken`
- `action` (was `accent-primary`) is consumed by 13 call sites — the filled
  action buttons and the icon-control hovers. It used to be zero.

The problem is the layer boundary, not the values. The action colour now has a
real semantic entry point; most other roles still don't, so the remaining work
is moving call sites onto the semantic layer — step 3 — not authoring or
re-picking tokens.

The ~37 remaining raw `vermillion-*` call sites are **not** all actions, and
converting them is not mechanical. They are three different jobs wearing one
colour: errors (which belong to `status-danger`), actions (`action`), and —
against the rule — section eyebrows like the `RECORDINGS` heading and the count
badge beside it, which are facts and should be azure. Step 3 has to classify
them, not find-and-replace them.

Every colour now resolves to one of four families. The only literal values left
are `white` and `black` (kept deliberately — 9 `text-white` on filled buttons,
plus `bg-black` for the modal scrim and the video letterbox behind the player's
album art), and the `theme-color` meta tag in `src/app/layout.tsx`, which needs
a static value because meta tags cannot read custom properties. **Keep that tag
equal to `--color-surface-app`** — it silently drifted once when paper was
re-picked, and a stale value there tints the mobile browser chrome a colour the
page no longer uses.

One dead literal remains: `--foreground: #ededed` inside the commented-out
`prefers-color-scheme: dark` block. It is unreachable; decide whether dark mode
is ever happening before spending anything on it.

## Naming rules that still bind

Keep the `--color-*` prefix: Tailwind 4 only generates utilities from namespaced
tokens. Semantic role names describe a **job**, not a rank in a palette — which
is why `accent-primary` became `action`. Do not add a primitive family; there
are four and the rule accounts for all of them.

### Semantic layer

- **`--color-action`** (`-hover`, `-press`) is the action colour, pointing at
  `vermillion-600`/`-700`/`-800`. Text on it uses `--color-text-on-accent`; do
  **not** add a parallel `action-on`.
- **`--color-text-link` is `azure-700`, not vermillion.** Links are azure by
  owner decision, even though a link is arguably a thing you do. The 20 link
  call sites are hardcoded `text-azure-900`, two steps darker than the alias —
  reconcile the two when step 3 converts them, rather than assuming the alias is
  right.
- `--color-status-success` is `azure-700`: success is a thing that is true, not
  a third accent.
- `--color-status-warning` and `--color-status-danger` are vermillion shades and
  therefore indistinguishable from actions — see open decisions.

## Corrections to earlier notes

Claims in previous versions of this file, and in the incoming spec, that were
wrong and should not be acted on:

- **There are no default-blue links.** Zero bare `<a>` tags in `src/`;
  navigation is 33 `<Link>`s and `--color-text-link` was never browser blue (it
  was teal, now `azure-700`). Nothing to fix unless a specific screen is
  identified.
- **The green was not a Spotify layer**, and it was not all success semantics
  either. It was 15 usages of Tailwind's *stock* green, never added to `@theme`
  — unchosen default, which is why it looked unrelated to everything else. On
  inspection it was doing three different jobs: success/confirmation, primary
  actions (play, add, submit), and plain links. Splitting it by meaning is why
  it did not resolve to a single replacement colour.

## Type system — **needs a build check first**

`globals.css` defines `--text-display-*`, `--text-body-*`, `--text-label-*` with
CSS `font` shorthand values (`700 56px/0.95 var(--font-display)`). These have
**zero usages**, and `--text-*` is Tailwind 4's *font-size* namespace, so the
shorthand may be emitting invalid `font-size`. Verify what the build actually
generates before adopting these; if broken, either reshape to Tailwind's
`--text-lg` / `--text-lg--line-height` pairing or move them out of the `--text-*`
namespace and apply via `font:`.

Target roles once the shape is settled: `display` (League Gothic, uppercase
only), `label` (uppercase, letterspaced, azure), `body`, `meta`, `numeric`
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
Native controls have no styling story at all: 5 raw `<select>`, 4 raw
`type="checkbox"`, and exactly one `focus-visible` treatment in the entire app
(`Switch.tsx`). Every native control ships with browser default appearance.

## Migration — what is left

The palette work is finished: the families are final, and stock green and slate
are gone. Two phases remain.

1. **Semantic adoption.** Convert the ~300 primitive call sites to layer-2 roles,
   one component or page per commit. Auth pages get converted in the same pass
   their form components are extracted. This is *not* a find-and-replace — see
   the raw `vermillion-*` call sites above, which are three different jobs
   wearing one colour and need classifying first.
2. **Native control replacement.** Checkbox, select, focus ring. Depends on the
   above for its colours.

None of the palette work above was verified in a browser — it was reasoned from
token values and ΔE measurements. A visual pass is owed before trusting it.

## Do not

- Do not "fix" colours opportunistically while doing other work. Colour changes
  happen as part of this migration, not as drive-bys.
- Do not invent new token names or add a primitive family.
- Do not rename `azure` to `navy`.
- Do not mix layout or spacing changes into a recolouring commit.

## Open decisions

- **Warning and danger have collapsed into the action colour.** Amber is gone
  (owner decision), so `--color-status-warning` is `vermillion-600` — identical
  to `--color-action` — and `--color-status-danger` is `vermillion-700`,
  identical to `--color-action-hover`. So a warning, a destructive action, and
  an ordinary "Add" button are now the same colour to a user, and a destructive
  button at rest looks like an ordinary one being hovered. The two-accent rule
  leaves no room for a third hue, so the distinction has to come from somewhere
  other than colour: wording, an icon, or a confirmation step. **Decide this
  before building anything destructive** — `DeleteButton` already exists.
- **Do vermillion section eyebrows survive?** The `RECORDINGS` heading and its
  count badge are vermillion, but headings and counts are facts, not actions —
  the rule says azure. Either they become azure in step 3, or the rule needs an
  explicit carve-out for display-font eyebrows.
- **Does the paper texture survive at 3× on mobile,** or does it need a separate
  asset? Not blocking.
