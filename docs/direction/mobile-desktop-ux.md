# Mobile and desktop UX

The implemented browse architecture is settled in
[ADR-0010](../adr/0010-responsive-browse-layout-hybrid-parallel-routes.md) and
[ADR-0015](../adr/0015-symmetric-artist-song-recording-panel-stacking.md): one
mounted route tree presents a single pane on mobile and persistent list/detail
panes on wider screens. This file records only the remaining UX choices.

## Standing constraints

- Use CSS for position, density, and visibility changes across breakpoints; do
  not fork the content tree into mobile and desktop implementations.
- Stable URLs and the existing parallel-route panes own navigation differences.
- Add Song and Add Recording remain local modals. Route-backed desktop modals or
  mobile bottom sheets require a separate product decision.
- Fixed panes own their safe-area padding. If the Songs list scroll container
  changes, move its `IntersectionObserver` root with the element that actually
  scrolls.
- The paper-grain overlay must be a real element to cover iOS safe areas. The
  current CSS mismatch is tracked in `local/wip/flagged.md`.

## Open decisions

- Exact breakpoint widths and whether the middle tier should use two static
  panes or an overlay.
- Desktop chrome and persistent-player placement.
- Final PWA branding and install assets.
