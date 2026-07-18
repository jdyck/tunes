# Styling cleanup

The color styling shows three generations of direction (confirmed by inventory, July 2026):

1. **Raw Tailwind colors** — `text-teal-700` (~15 uses, detail-pane actions/headings), `green-*` (~13), `slate-700/800` (`PrimaryButton`, player) — plus a legacy `bg-old-*` prefix (4 uses).
2. **Custom palette in `globals.css` `@theme`** — `azure`, `ink`, `merino`, `mojo`, `surface` scales. `ink` is well-adopted (`text-ink-600` ×57); `azure` is mostly confined to auth pages.
3. Whatever the current direction is — **not yet recorded anywhere. That's the missing decision.**

Decision owner note: the actual palette/token values are decided outside this repo (design-token work is external); what belongs *here* is the mapping from roles to tokens and the mechanical migration.

## Do not

- Do not "fix" colors opportunistically while doing other work. Color changes only happen as part of the migration tasks below, after the target mapping exists.
- Do not invent new token names.

## Task 1: token usage inventory in the component gallery — **DONE (July 2026)**

Add a per-component "tokens used" panel to the dev component gallery (`/dev/components/<slug>` pages). Not weird — this is a standard style-guide feature (Storybook design-token addons do the same).

Suggested approach, simplest first:

- Build-time/static: a small script (or a dev-only API route) that reads the component's source file and regex-extracts color-bearing classes (`(bg|text|border|ring)-{palette}-{shade}` plus `bg-old-*` and `surface`/`border-default` semantic names), and shows them as swatches with counts on the gallery page. Static analysis is fine — miss rate on dynamic class construction is acceptable; note misses rather than chasing them.
- Nice-to-have: flag classes that use raw Tailwind palettes (teal/green/slate/red/etc.) vs the custom `@theme` palette, so drift is visible at a glance.

This gives the visual overview needed to make the mapping decision in Task 2.

## Task 2: define the role → token mapping — **UNBLOCKED — needs the palette decision**

Once Task 1 exists, decide and record here: for each *role* (primary action, destructive/error, success, muted text, headings/accent, surfaces/borders), which token family is canonical. Open question to settle: does `teal` (current de-facto accent) get promoted into the `@theme` palette under a real name, or does an existing family (azure?) take over its role?

## Task 3: mechanical migration — **blocked on Task 2**

Convert call sites to the mapping, one component/page per commit, no layout or spacing changes mixed in. Kill `bg-old-*` entirely. Auth pages (see [component-extraction.md](component-extraction.md) task 3) get converted in the same pass their form components are extracted — extraction and recoloring can land together *there only*, because the target styling will finally be known.
