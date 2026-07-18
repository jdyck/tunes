# Component extraction

Candidates for new shared components, found by scanning for repeated inline markup (July 2026). Each task is independent unless noted. Ground rules for all of them:

- Reuse the existing Tailwind classes verbatim when extracting — do not redesign, recolor, or "improve" styling in the same change. Visual changes are a separate conversation (theme/design tokens are decided outside this repo).
- Every new shared component gets a `componentRegistry.ts` entry plus a demo page under `src/app/(browse)/@detail/dev/components/<slug>/` (copy an existing demo page as the template).
- One component per PR/commit-series; touch call sites in the same change so the old markup is actually deleted.

## 1. LinkButton (highest leverage, no decisions pending)

The underlined text-action pattern appears ~15 times, mostly in `SongDetailContent.tsx` and `RecordingDetailContent.tsx` (Search / Cancel / Clear match / Choose different match actions). Two visual variants exist in the wild:

- primary: `text-xs text-teal-700 underline disabled:opacity-70`
- muted: `text-xs text-ink-600 underline`

Build `src/components/LinkButton.tsx` with a `variant?: "primary" | "muted"` prop (default `primary`), passing through standard button props. Convert call sites in `SongDetailContent.tsx` and `RecordingDetailContent.tsx`; leave any occurrence that doesn't match one of the two variants exactly alone and note it in the PR.

## 2. FormStatusMessage (no decisions pending)

Inline status/error line under forms: `<p className="text-sm text-mojo-600">` on login/signup/forgot-password, plus the error/success variant on `account/page.tsx` (`text-mojo-600` / `text-green-700`). Build a small component taking `{ type: "error" | "success", children }` and convert those four pages.

## 3. Auth form input + submit button — **blocked on Decision A**

All four auth-ish pages (`login`, `signup`, `forgot-password`, `account`) hand-roll:

- text inputs: `className="p-2 border border-border-default rounded"` (~9 occurrences)
- a submit button: `bg-azure-600 text-white uppercase text-lg p-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-70` with a `<Spinner /> + "Logging in"`-style busy state

The problem: existing shared components don't match. `PrimaryButton` is `bg-slate-700 rounded-lg` (different color, no busy state); `FormField` has a different input style (`p-1.5 rounded-md`, no border). So this is either (a) new `TextInput` + `SubmitButton` components that encode the auth styling, or (b) unify styling onto the existing components. That's a visual/design call — the drift and its cleanup are scoped in [styling-cleanup.md](styling-cleanup.md); this task stays blocked until that doc's role→token mapping exists, and then extraction + recoloring of these pages land together. Do not pick silently.

## 4. SectionHeading (no decisions pending)

The League Gothic teal `<h2>` + count-badge pill in `SongDetailContent.tsx` (~line 452): heading text in `font-bold text-teal-700 text-xl uppercase ${leagueGothic.className}`, optional count in a `rounded-full bg-teal-700` pill with `robotoCondensed`. Extract as `SectionHeading({ children, count? })`. Currently one call site, but it's the established visual for detail-pane sections; extract when a second section header is added, or now if convenient.

## 5. NotesField (small, do after SaveStatusButton usage is understood)

Both `SongDetailContent.tsx` (~line 388) and `RecordingDetailContent.tsx` (~line 468) have a near-identical notes `<textarea>` wired to the same dirty/save flow that `SaveStatusButton` indicates. Extract a `NotesField` (label, value, onChange, textarea styling). Keep the save-state logic in the parent — this is a presentational extraction only.

## 6. InlineSearchForm — **deliberately deferred**

The label + input + checkbox + search/cancel button cluster in `RecordingDetailContent.tsx` (~lines 368–421, MusicBrainz search) resembles search UI in `AddSongModal`/`AddRecordingModal`, but the modals differ enough that a shared abstraction now would be speculative. Wait for a third use. Don't build this without being asked.

## Registry gaps (independent of extraction)

`componentRegistry.ts` lacks entries for existing components: `AccountMenu`, `SongsListPane`, `AddRecordingMatchSuggestion`, `SongDetailContent`/`RecordingDetailContent` (arguably too page-like for the gallery — skip those two unless asked). Adding `AccountMenu` and the search-result row family's missing members is fair game any time.
