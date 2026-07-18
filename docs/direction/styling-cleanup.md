# Styling cleanup

The color styling shows three generations of direction:

1. **Raw Tailwind colors** — `text-teal-700` (detail-pane actions/headings), `green-*`, `slate-700/800` (`PrimaryButton`, player) — plus a legacy `bg-old-*` prefix.
2. **Custom palette in `globals.css` `@theme`** — `azure`, `ink`, `merino`, `mojo`, `surface` scales. `ink` is well-adopted; `azure` is mostly confined to auth pages.
3. Whatever the current direction is — **not yet recorded anywhere. That's the missing decision.**

Decision owner note: the actual palette/token values are decided outside this repo (design-token work is external); what belongs *here* is the mapping from roles to tokens and the mechanical migration.

The dev component gallery shows a per-component "Color tokens in source" panel (`TokenInventoryPanel`, backed by `/api/dev/component-tokens`) that flags classes outside the `@theme` palette — use it to survey the drift before deciding.

## Do not

- Do not "fix" colors opportunistically while doing other work. Color changes only happen as part of the migration below, after the target mapping exists.
- Do not invent new token names.

## Define the role → token mapping — **needs the palette decision**

Decide and record here: for each *role* (primary action, destructive/error, success, muted text, headings/accent, surfaces/borders), which token family is canonical. Open question to settle: does `teal` (current de-facto accent) get promoted into the `@theme` palette under a real name, or does an existing family (azure?) take over its role?

## Mechanical migration — blocked on the mapping

Convert call sites to the mapping, one component/page per commit, no layout or spacing changes mixed in. Kill `bg-old-*` entirely. Auth pages (see [component-extraction.md](component-extraction.md)) get converted in the same pass their form components are extracted — extraction and recoloring can land together *there only*, because the target styling will finally be known.
