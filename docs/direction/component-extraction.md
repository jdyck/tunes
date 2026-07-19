# Component extraction

Candidates for new shared components. Ground rules:

- Reuse the existing Tailwind classes verbatim when extracting — do not redesign, recolor, or "improve" styling in the same change (see [styling-cleanup.md](styling-cleanup.md)).
- Every new shared component gets a `componentRegistry.ts` entry (slug, name, path) plus a demo page under `src/app/(browse)/@detail/dev/components/<slug>/` (copy an existing demo page as the template).
- One component per PR/commit-series; touch call sites in the same change so the old markup is actually deleted.
- Treat empty states as part of a component's design, not a separate afterthought. When a component's filled-state layout or visual language changes, update its empty state (and loading state where relevant) in the same work so they stay coherent.

## Auth form input + submit button — **blocked on the styling role→token mapping**

All four auth-ish pages (`login`, `signup`, `forgot-password`, `account`) hand-roll:

- text inputs: `className="p-2 border border-border-default rounded"` (~9 occurrences)
- a submit button: `bg-azure-600 text-white uppercase text-lg p-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-70` with a `<Spinner /> + "Logging in"`-style busy state

The problem: existing shared components don't match. `PrimaryButton` is `bg-slate-700 rounded-lg` (different color, no busy state); `FormField` has a different input style (`p-1.5 rounded-md`, no border). Whether these become new `TextInput`/`SubmitButton` components or the existing ones absorb them depends on the role→token mapping in [styling-cleanup.md](styling-cleanup.md) Task 2 — once that exists, extraction + recoloring of these pages land together. Do not pick silently.

## NotesField (small)

Both `SongDetailContent.tsx` and `RecordingDetailContent.tsx` have a near-identical notes `<textarea>` wired to the same dirty/save flow that `SaveStatusButton` indicates. Extract a `NotesField` (label, value, onChange, textarea styling). Keep the save-state logic in the parent — this is a presentational extraction only.

## Save feedback — replace the persistent status icon

`SaveStatusButton` currently stays visible at all times as an icon that changes between saved and unsaved. Replace that pattern across detail editors:

- When edits are dirty, show a clear Save button.
- After a successful save, replace it with a success message such as “Saved”.
- Hide that success message after five seconds; no saved/clean-state icon should remain by default.
- Warn before route navigation or another action would discard dirty edits.

Keep the dirty/save state shared and consistent between Song and Recording detail views. The eventual component API should represent the distinct dirty, saving/error (if applicable), and recently-saved states rather than reducing them to a boolean `isSaved` icon toggle.

When `SaveStatusButton` is removed, delete its `componentRegistry.ts` entry and its dev-gallery demo page (`src/app/(browse)/@detail/dev/components/save-status-button/`) in the same change, and register/demo the replacement component instead.

## InlineSearchForm — deliberately deferred

The label + input + checkbox + search/cancel button cluster in `RecordingDetailContent.tsx` (MusicBrainz search) resembles search UI in `AddSongModal`/`AddRecordingModal`, but the modals differ enough that a shared abstraction now would be speculative. Wait for a third use. Don't build this without being asked.

## Registry gaps (independent of extraction)

`componentRegistry.ts` lacks entries for existing components: `AccountMenu`, `SongsListPane`, `AddRecordingMatchSuggestion` (`SongDetailContent`/`RecordingDetailContent` are arguably too page-like for the gallery — skip unless asked). Adding the missing ones is fair game any time.
