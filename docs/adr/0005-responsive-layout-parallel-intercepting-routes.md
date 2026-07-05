# Responsive layout: master-detail panes via parallel + intercepting routes, CSS reflow everywhere else

Most of the app's mobile/desktop differences (information density, nav chrome placement, hover-vs-tap affordances) are handled with plain Tailwind breakpoints reflowing the same components — no branching needed, since the content and interaction model are identical, just repositioned or thinned out. The one place that isn't true is the song list → song detail → recording detail chain: desktop has room to show list, song detail, and recording detail as up to three panes side by side and update them in place, while mobile can only show one at a time and must navigate full-screen between them. That's a genuine difference in navigation model, not just layout, so it needs real routing logic rather than a CSS-only fix.

We decided to implement this with Next.js App Router **parallel routes** (`@list` / `@detail` slots composed by a shared layout) plus **intercepting routes**, so a single URL (e.g. `/tune/5/recording/12`) drives both experiences: on desktop, navigating to a song or recording intercepts the link and renders it into the `@detail` slot alongside the still-visible list; on mobile (or on direct load/refresh, where there's nothing to intercept from), the same URL renders as an ordinary full-page navigation. One route tree, no duplicated pages, and the URL stays deep-linkable in both cases. The add-song/add-recording forms are expected to reuse the same intercepting-route technique for their modal-on-desktop / bottom-sheet-on-mobile treatment.

## Considered

Plain client-side viewport checks (each detail page manually renders its sibling panes based on `window.innerWidth` when wide enough) — rejected for the primary implementation because it duplicates fetch/render logic across pages and doesn't get URL-driven slot composition for free, but is the fallback if parallel routes prove awkward in practice.

## Consequences

Whether there's an intermediate 2-pane tablet tier (list + one active detail pane) between mobile's 1-pane stack and desktop's 3-pane view, and the exact pixel breakpoints, are deliberately left open — see [direction/mobile-desktop-ux.md](../direction/mobile-desktop-ux.md) — to be decided once a rough version of the 3-pane layout is on screen, since that's the highest-rework-risk piece of this decision if the UX doesn't hold up.
