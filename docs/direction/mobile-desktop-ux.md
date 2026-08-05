# One app, mobile and desktop UX

Today every page is a single narrow column (`max-w-screen-md`, [layout.tsx](../../src/app/layout.tsx)) regardless of viewport — desktop just gets the same phone-width layout centered in empty space. This is the plan for making one codebase genuinely good on both, without forking into separate mobile/desktop apps.

Note: this covers UX *architecture* (layout structure, navigation model, information density) — not visual/component styling, which the owner is working out separately outside this project. Don't jump to final visual polish here; the goal is a working structural skeleton.

## General approach

Two different techniques apply depending on what's actually changing between breakpoints:

- **Same content, different position/density/visibility** → pure CSS (Tailwind breakpoints: `hidden md:block`, grid/flex reflow). This covers: how much Recording metadata is visible at once, where the top header/account menu and the persistent player bar sit, nav shape, hover-vs-tap affordances. No JS branching, no duplicated markup — just reflow the same component tree. Left unspecified in this doc since it's low-risk and cheap to change later; decide the specifics when actually building each screen.
- **Same content, different navigation/interaction model** → needs real routing logic. This applies to exactly one relationship in the app (see below): everything else is the CSS case.

## The master-detail chain: list → Song detail → Recording detail

Desktop has room to show the Song list, the active Song's detail, and the active Recording's detail as up to three panes side by side, updating in place as you click through. Mobile visually presents one screen at a time (list → tap Song → Song detail → tap Recording → Recording detail, back returns one screen at a time) while the shared layout may retain covered panes in the mounted tree.

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

The implemented architecture is documented in [ADR-0010](../adr/0010-responsive-browse-layout-hybrid-parallel-routes.md): the browse layout renders one persistent list, with parallel Song/Artist and nested Recording detail slots. CSS changes the presentation across breakpoints while stable URLs drive the active detail. Pathname gates intentionally hide stale parallel-slot content retained by soft navigation.

Add Song and Add Recording currently use local modal state. Whether they should become route-backed desktop modals and mobile bottom sheets is a separate future decision.

## Open questions

- **Breakpoint tiers**: the current layout progresses from one mobile pane to a desktop list/detail composition, overlays Recording detail at narrower desktop widths, and reaches three side-by-side panes at the widest tier. Exact widths and whether the middle tier should instead show two non-overlapping panes remain open visual/interaction questions.
- **Chrome placement specifics**: exact shape of header/nav and player-bar positioning on desktop (e.g. whether nav becomes a sidebar) — pure CSS, low risk, decide per-screen when building it.
- **PWA/safe-area**: the app has `display: standalone` in [manifest.json](../../public/manifest.json) for mobile home-screen install, with `viewport-fit=cover` and `apple-mobile-web-app-status-bar-style: black-translucent` in [layout.tsx](../../src/app/layout.tsx) — the latter is what actually lets the page extend under the notch/Dynamic Island/home indicator; `default`/`black` reserve an opaque status bar strip that content can't render behind, regardless of `viewport-fit`. `html`/`body` now carry the app's own merino background rather than a black fallback. The fixed panes (songs list, song detail, recording detail, dev-components) each pad themselves with `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`, since `position: fixed` elements ignore an ancestor's padding — a global padding-top on the root wrapper only reaches normal-flow content. `overscroll-behavior: none` is applied at the root and on every independently-scrolling pane to kill iOS's rubber-band bounce/pull-to-refresh. Two non-obvious things if you touch this again:
  - `html::after`/`::before` pseudo-elements don't get the same safe-area extension WebKit gives real elements, even `position: fixed` ones — the paper-grain overlay had to move from `html::after` to a real `<div className="paper-grain">` (rendered in `layout.tsx`, styled in `globals.css`) to reach behind the notch.
  - iOS bakes manifest/meta-tag config into a home-screen icon at "Add to Home Screen" time — testing changes requires deleting and re-adding the icon, not just reloading.

- **Open: content still scrolls under the notch mid-scroll.** `env(safe-area-inset-top)` padding on a fixed pane only protects what's on screen at `scrollTop: 0` — once the pane actually scrolls, that padding scrolls away with everything else, and later content ends up rendered right at the physical top edge, under the notch. `SongsListPane` doesn't have this problem: its "Songs" title/search/sort header is a non-scrolling flex sibling *outside* the scrollable region — only a nested `flex-1 overflow-y-auto` div (just the song rows) actually scrolls, and that inner box's top edge sits well below the header, never at the screen edge, so scrolled content can never reach the notch. `SongDetailLayout` ([src/app/(browse)/@detail/song/[id]/layout.tsx](../../src/app/(browse)/@detail/song/[id]/layout.tsx)) and `RecordingPaneGate` ([src/components/layout/RecordingPaneGate.tsx](../../src/components/layout/RecordingPaneGate.tsx)) don't follow this pattern — they put `overflow-y-auto` and the safe-area padding on the single outer pane that also holds the back-link/title (from `SongDetailContent`/`RecordingDetailContent`), so scrolling the detail content lets it pass under the notch. Fix is to split each into the same shape as `SongsListPane`: an outer fixed pane that's unscrollable (just sized + padded to the safe area) with a pinned header, and an inner `flex-1 overflow-y-auto` region for the rest of the content. The dev-components detail pane has the same issue but is dev-only, lower priority.

  Note that `SongsListPane`'s inner scrollable div is now also the
  `IntersectionObserver` root for the list's scroll-to-load-more window (see
  [songs-list-loading.md](songs-list-loading.md)) — if that pane is ever
  restructured, the observer root has to move with the element that actually
  scrolls.
