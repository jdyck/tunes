# Styling cleanup

The palette decision this file was blocked on has been made. What follows is the
target system and the migration to it.

**The rule: vermillion = things you do, navy = things that are true.**

Every interactive control is vermillion. Every piece of factual information —
composer credits, counts, labels, metadata, section eyebrows — is navy or ink.
Cream and tan are surface. Nothing else is a brand color. Any color on screen
must be explainable by this rule.

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
badge beside it, which are facts and should be navy. Step 3 has to classify
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

## Primitive rename — **unblocked**

Primitive names change to match the design vocabulary. Semantic role names
mostly **do not change** — the exception is `accent-primary`, now `action`; see
below. Keep the `--color-*` prefix: Tailwind 4 only generates utilities from
namespaced tokens.

| Now | Becomes | Notes |
|---|---|---|
| `mojo` | `vermillion` | **Done.** `vermillion-600` `#c54226` is the action colour — brick red, deliberately not a signal red. |
| `orange` | *deleted* | **Done.** Zero usages; it was shadowing the real accent. |
| `azure` | `navy` | `azure-600` `#376091` is the workhorse and already reads as navy. **The last rename outstanding.** |
| `merino` + `old-lace` | `paper` | **Done.** The two warm neutrals merged into one family under merino's hexes; old-lace's more saturated golden ramp is deleted. `paper-50` is `--color-surface-app`. |
| `line` | *folded into* `paper-600` | **Done.** `line-100` and `line-200` were the same hex (`#D9D0BE`) registered twice — a redundancy, not two roles. It landed on `paper-600` (`#D9D2C9`, ΔE 4.86), *not* the `paper-200` an earlier draft of this table named: that was measured against the old paper ramp, and the re-picked one would have lightened every border by several steps. |
| `teal` | *deleted* | **Done.** Absorbed into `azure`, not vermillion — owner decision, overriding the earlier reading that links are actions. Azure's ramp runs ~2 steps lighter than teal's at the same number, so shades were mapped by lightness: `teal-500`→`azure-700`, `-600`→`-800`, `-700`→`-900`. |
| `ink` | `ink` | Unchanged. Already warm (`ink-900` = `#201d1b`); no `#000` in the build. |
| `amber` | *deleted* | **Done.** Absorbed into `vermillion` by owner decision, resolving the open question below. Its one warning message and `--color-status-warning` both point at `vermillion` now. |

Sample final values from the build rather than re-picking from the mockup; the
existing families are coherent and the deltas are small (spec vermillion-500
`#C0392B` vs `mojo-600` `#c54226`; spec navy-500 `#3B5B8C` vs `azure-600`
`#376091`).

### Semantic layer changes

- **`--color-accent-primary` is now `--color-action`** (`-hover`, `-press`),
  pointing at `vermillion-600`/`-700`/`-800`. Renamed because there is exactly
  one accent and its meaning is "you can do this" — `accent-primary` described
  its rank in a palette, not its job. Components should reach for `action`; the
  primitive is the value, the role is the meaning. Text on it uses the existing
  `--color-text-on-accent`; do not add a parallel `action-on`.
- `--color-status-warning` → `vermillion-600` (was amber). It is now
  indistinguishable from an action — see open decisions.
- `--color-text-link` → **`azure-700`**, not vermillion. Links stayed navy by
  owner decision. Note the 20 link call sites are hardcoded `text-azure-900`,
  two steps darker than the alias — reconcile the two when step 3 converts those
  call sites, rather than assuming the alias is right.
- `--color-focus-ring` → `azure-700` (navy, as planned).
- `--color-status-success` → `azure-700` — success is a thing that is true, not
  a third accent. Green is not remapped to a quieter green; it is gone.
- `--color-accent-secondary` → `azure-700`, hover `azure-800` (was teal).

## Corrections to earlier notes

Three claims in previous versions of this file, and in the incoming spec, were
wrong and should not be acted on:

- **`bg-old-lace-*` was never a "legacy prefix."** It was a registered `@theme`
  family, and `old-lace-50` was `--color-surface-app`. It is gone now because
  its ramp genuinely duplicated `merino`'s job in a more saturated key — the two
  merged into `paper` — not because it was legacy debt.
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
- `SaveStatusButton`'s lightning bolts now read navy (saved) / vermillion
  (unsaved) rather than green/vermillion, so they are at least explainable by
  the rule. This is a holding position: the component is still scheduled for
  deletion in `component-extraction.md`, and that deletion remains the real fix.

Native controls have no styling story at all: 5 raw `<select>`, 4 raw
`type="checkbox"`, and exactly one `focus-visible` treatment in the entire app
(`Switch.tsx`). Every native control ships with browser default appearance.

## Migration — order matters

1. **Primitive rename + semantic repoint.** `paper`, `vermillion`, the teal and
   amber absorptions, the `line` fold, and the `action` role have all landed;
   `orange`, `amber` and `line` are deleted. **All that remains is
   `azure`→`navy`** — a pure rename with no visual change.

   Four families are left — `azure`, `ink`, `paper`, `vermillion` — and every
   colour on screen resolves to one of them.
2. **Green and slate purge. Done.** Stock green and slate are gone from `src/`.
   Green split by what each usage meant rather than by being green:
   success/confirmation (`FormStatusMessage`, `SaveStatusButton`, saved
   check/spinner) → navy; action controls → brick red, either filled
   (`PrimaryButton`, auth submits, the Recording detail Play button) or
   ink-at-rest/red-on-hover in repeating rows. The green links on the auth pages
   went to `azure-900`, matching every other link.
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
  the rule says navy. Either they become navy in step 3, or the rule needs an
  explicit carve-out for display-font eyebrows.
- **Does the paper texture survive at 3× on mobile,** or does it need a separate
  asset? Not blocking.
