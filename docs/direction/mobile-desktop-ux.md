# One app, mobile and desktop UX

Today every page is a single narrow column (`max-w-screen-md`, [layout.tsx](../../src/app/layout.tsx)) regardless of viewport — desktop just gets the same phone-width layout centered in empty space. This is the plan for making one codebase genuinely good on both, without forking into separate mobile/desktop apps.

Note: this covers UX *architecture* (layout structure, navigation model, information density) — not visual/component styling, which the owner is working out separately outside this project. Don't jump to final visual polish here; the goal is a working structural skeleton.

## General approach

Two different techniques apply depending on what's actually changing between breakpoints:

- **Same content, different position/density/visibility** → pure CSS (Tailwind breakpoints: `hidden md:block`, grid/flex reflow). This covers: how much Recording metadata is visible at once, where the top header/account menu and the persistent player bar sit, nav shape, hover-vs-tap affordances. No JS branching, no duplicated markup — just reflow the same component tree. Left unspecified in this doc since it's low-risk and cheap to change later; decide the specifics when actually building each screen.
- **Same content, different navigation/interaction model** → needs real routing logic. This applies to exactly one relationship in the app (see below): everything else is the CSS case.

## The master-detail chain: list → song detail → recording detail

Desktop has room to show the song list, the active song's detail, and the active recording's detail as up to three panes side by side, updating in place as you click through. Mobile can only show one screen at a time and must navigate full-screen (list → tap song → song detail → tap recording → recording detail, back button to return). See [ADR-0005](../adr/0005-responsive-layout-parallel-intercepting-routes.md) for why this is implemented with Next.js parallel + intercepting routes rather than client-side viewport checks.

```
Desktop (wide enough for 3 panes):
+----------+----------------+-------------------+
|  List    |  Song detail   |  Recording detail  |
| (persist)|  (updates)     |  (updates)         |
+----------+----------------+-------------------+

Mobile:
Screen 1: List --tap--> Screen 2: Song detail --tap--> Screen 3: Recording detail
(back button returns one screen at a time)
```

Add-song/add-recording forms are expected to follow the same overlay idea: a modal on desktop, a bottom sheet (slide-up panel) on mobile, likely via the same intercepting-route technique. Not yet built — scoped for a later pass once the browsing experience above is proven out.

## Build order

1. **Prototype the 3-pane structure first, rough and unstyled.** This is the highest-rework-risk piece — if the side-by-side interaction doesn't feel right, it's the most expensive thing to unwind. Get it structurally on screen before spending time on any visual treatment.
2. Once the panes exist, decide the breakpoint tiers (see open question below) by actually looking at it at different widths.
3. Layer in the CSS-only reflow work (chrome placement, density, nav shape) per screen as it's touched.
4. Add-song/add-recording modal/bottom-sheet treatment, once browsing is solid.

## Open questions

- **Breakpoint tiers**: is there an intermediate tablet/narrow-laptop tier showing 2 panes (list + one active detail, which itself drills between song/recording), or does it jump straight from 1 pane to 3? Deferred until the 3-pane prototype exists to look at.
- **Chrome placement specifics**: exact shape of header/nav and player-bar positioning on desktop (e.g. whether nav becomes a sidebar) — pure CSS, low risk, decide per-screen when building it.
- **PWA/safe-area**: the app has `display: standalone` in [manifest.json](../../public/manifest.json) for mobile home-screen install, with `viewport-fit=cover` and `apple-mobile-web-app-status-bar-style: black-translucent` in [layout.tsx](../../src/app/layout.tsx) — the latter is what actually lets the page extend under the notch/Dynamic Island/home indicator; `default`/`black` reserve an opaque status bar strip that content can't render behind, regardless of `viewport-fit`. `html`/`body` now carry the app's own merino background rather than a black fallback. The fixed panes (songs list, song detail, recording detail, dev-components) each pad themselves with `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`, since `position: fixed` elements ignore an ancestor's padding — a global padding-top on the root wrapper only reaches normal-flow content. `overscroll-behavior: none` is applied at the root and on every independently-scrolling pane to kill iOS's rubber-band bounce/pull-to-refresh. Two non-obvious things if you touch this again:
  - `html::after`/`::before` pseudo-elements don't get the same safe-area extension WebKit gives real elements, even `position: fixed` ones — the paper-grain overlay had to move from `html::after` to a real `<div className="paper-grain">` (rendered in `layout.tsx`, styled in `globals.css`) to reach behind the notch.
  - iOS bakes manifest/meta-tag config into a home-screen icon at "Add to Home Screen" time — testing changes requires deleting and re-adding the icon, not just reloading.

- **Open: content still scrolls under the notch mid-scroll.** `env(safe-area-inset-top)` padding on a fixed pane only protects what's on screen at `scrollTop: 0` — once the pane actually scrolls, that padding scrolls away with everything else, and later content ends up rendered right at the physical top edge, under the notch. `SongsListPane` doesn't have this problem: its "Songs" title/search/sort header is a non-scrolling flex sibling *outside* the scrollable region — only a nested `flex-1 overflow-y-auto` div (just the song rows) actually scrolls, and that inner box's top edge sits well below the header, never at the screen edge, so scrolled content can never reach the notch. `SongDetailLayout` ([src/app/(browse)/@detail/song/[id]/layout.tsx](../../src/app/(browse)/@detail/song/[id]/layout.tsx)) and `RecordingPaneGate` ([src/components/layout/RecordingPaneGate.tsx](../../src/components/layout/RecordingPaneGate.tsx)) don't follow this pattern — they put `overflow-y-auto` and the safe-area padding on the single outer pane that also holds the back-link/title (from `SongDetailContent`/`RecordingDetailContent`), so scrolling the detail content lets it pass under the notch. Fix is to split each into the same shape as `SongsListPane`: an outer fixed pane that's unscrollable (just sized + padded to the safe area) with a pinned header, and an inner `flex-1 overflow-y-auto` region for the rest of the content. The dev-components detail pane has the same issue but is dev-only, lower priority.
