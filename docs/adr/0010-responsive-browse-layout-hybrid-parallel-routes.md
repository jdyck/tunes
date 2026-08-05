# Responsive browse layout: persistent list plus parallel detail panes

## Decision

The browse experience uses one persistent list rendered by the shared browse
layout, an `@detail` parallel slot for Song and Artist detail, and a nested
`@recording` slot for Recording detail. CSS breakpoints change which of those
already-mounted panes are visible or overlaid:

- mobile presents one pane at a time;
- desktop retains the list and active detail panes side by side where space
  permits;
- every selected Song and Recording still has a stable, refreshable URL.

`BrowseLayoutShell` owns the list and responsive pane composition. Pathname
gates deliberately prevent a parallel slot retained by a soft navigation from
appearing when the current URL no longer represents that detail. They remain
until a simpler Next.js slot-clearing route is proven to behave equivalently
for direct loads, soft navigation, and Back/Forward.

This supersedes [ADR-0005](0005-responsive-layout-parallel-intercepting-routes.md).
The app does not use an `@list` slot, separate ordinary/intercepted detail
trees, or intercepting-route folders for this experience.

## Why

The implemented hybrid evolved past the client-rendering fallback rejected by
ADR-0005: the list and each detail type are rendered once, rather than fetched
or duplicated across separate mobile and desktop page trees. A local behavior
audit confirmed the critical sampled paths:

- soft list → Song → Recording navigation retained the expected pane context;
- direct Recording reloads preserved deep-link behavior;
- browser Back/Forward moved between Recording and Song once per history step;
- selecting another Song cleared the old Recording; and
- leaving Song detail for the Artists destination cleared the old editor.

Formalizing the working route tree avoids a high-churn migration whose main
original benefit—one implementation per detail—has already been achieved.

## Consequences

Song and Recording editors can be mounted simultaneously even when only one is
visible at a narrow viewport. Browse-wide concerns such as dirty-navigation
protection therefore live at the browse-layout boundary and register editors
by stable route identity. A navigation decision must consider which registered
editors its destination would discard; it cannot assume the most recently
mounted editor is the only active one.

Parallel slots intentionally retain state during some soft navigations, so the
pathname gates are architecture rather than temporary presentation hacks.
Changes to those gates require route testing across direct load, refresh,
client navigation, and Back/Forward.

Add Song and Add Recording remain local overlays. Route-backed modal or bottom
sheet behavior is a separate future decision, not an implied part of browse
routing.

The sampled audit did not settle invalid or mismatched IDs, logout with active
slots, exact scroll/focus restoration, or production-only routing differences.
Those are verification cases when related routing or navigation-guard work
touches them, not reasons to replace the established tree preemptively.
