# Code organization

Structural cleanups scoped July 2026. Tasks marked **blocked on Decision X** must not be started until that decision is recorded here (or in an ADR) — agents should not guess.

## Decisions (recorded July 2026)

- **Decision A — form styling: RESOLVED as drift, not intent.** The azure/teal/slate divergence is three generations of direction, none canonical yet. Cleanup is scoped in [styling-cleanup.md](styling-cleanup.md); component-extraction task 3 stays blocked until that doc's role→token mapping (its Task 2) exists.
- **Decision B — components folder scheme: CONFIRMED — feature folders + `ui/`.** Chosen shape: `components/ui/` (generic primitives: Spinner, Modal, FormField, PrimaryButton, BackLink, NavLink, AsyncStateMessage, LinkButton…), `components/layout/` (shells, gates, panes), `components/song/`, `components/recording/`, `components/player/`. Rationale: upcoming features — Lead Sheets (user-uploaded + public-domain charts, see [ADR-0002](../adr/0002-lead-sheets-admin-gated-publishing.md)) and Playlists (ordered subsets of a user's songs) — each get their own folder when they arrive, so the scheme scales by feature. ("Churn" just means: moving a file requires updating every `@/components/X` import that points at it — a one-time mechanical cost, which is why the scheme is picked once.)
- **Decision C — `Tune` rename: APPROVED, phased.** The project is moving fully from Tune to Song. The interim type-only rename (below) is explicitly allowed; the DB split remains separately scoped in [song-user-song-split.md](song-user-song-split.md). The old "don't do it unprompted" guardrail was about agents improvising mid-task — scoped, deliberate execution is wanted.
- **Decision D — RESOLVED: rename to `ListPaneSwitch`** (it switches between the two list panes; accurate and un-gate-like).
- **Decision E — `lib` vs `utils`: CONFIRMED.** The rule: **`lib` = anything effectful or stateful** (I/O, singletons, fetch wrappers, config — supabaseClient, the three `*Client.ts` fetch wrappers, fonts, componentRegistry), **`utils` = pure functions** (youtube.ts parsing, songWriters, etc.). Pro: a crisp pure-vs-effectful rule agents can apply without judgment, and it matches AGENTS.md's existing "infra clients" wording. Con: moves three files now, and mixed files must be split. The alternative (redefine `lib` as "singletons only", leave clients in utils) avoids moves but leaves a fuzzy boundary that will drift again.
- **Decision F — match-suggestion names: DEFERRED deliberately.** The whole matching area (MusicBrainz match quality is poor with available data) needs functional rework; naming will be settled as part of that rework, when the concepts are clearer. Do not rename these two components before then.

## Tasks

### Fix stale AGENTS.md repo layout (no decisions pending — do first)

The "Repo layout" section still lists `add-tune/`, `tune/[id]/`, `tune/[id]/add-recording/`, `recording/[id]/` as live routes. Reality: routes live under `src/app/(browse)/` with parallel slots — `(browse)/@detail/song/[id]`, nested `@recording` slot for `recording/[recordingId]`, `(browse)/songs`, plus `account/`, `api/` metadata routes, and a dev-only component gallery at `(browse)/@detail/dev/components` (gated by `MiddlePaneGate` to development builds). Also missing: `src/hooks/`. Update the layout block to match `find src/app -type d` reality; keep it lean. Also update the stale route bullet in [song-user-song-split.md](song-user-song-split.md) if not already done. See [ADR-0005](../adr/0005-responsive-layout-parallel-intercepting-routes.md) for why the layout is shaped this way.

### Rename `RecordingPaneWrapper` → `RecordingPaneGate` (no decisions pending)

Its own comment says it mirrors `DetailPaneGate`; it is a gate. Pure rename: file, component, imports. No behavior change.

### Convert `src/lib/supabaseClient.js` to TypeScript (no decisions pending)

Last remaining `.js` file. Rename to `.ts`, add types for the exported client. No behavior change; verify `npm run build` passes.

### Rename `MiddlePaneGate` → `ListPaneSwitch` (unblocked)

Pure rename; update the `(browse)/layout.tsx` import.

### `Tune` → `Song` type rename (unblocked — approved interim step)

Rename the `Tune` interface in `src/types/types.ts` to `Song`, update imports in `SongDetailContent`, `SongsListContext`, `SongsListPane`, `RecordingDetailContent`, `AddSongModal`, `utils/wikipedia.ts`, `utils/musicbrainz.ts`. Do **not** touch the `public.tunes` table, Supabase queries' table names, or the field shape — that's the real split ([song-user-song-split.md](song-user-song-split.md)).

### Group `src/components/` into folders (unblocked — Decision B confirmed)

Mechanical move + import updates per the scheme in Decision B. Do it in one commit with no other changes so the diff is reviewable as pure moves. Update AGENTS.md's layout section in the same change.

### Apply the `lib`/`utils` rule (unblocked — Decision E confirmed)

Move the effectful modules from `src/utils` into `src/lib`: `songMetadataClient.ts`, `recordingMetadataClient.ts`, `youtubeSearchClient.ts` (fetch wrappers). Pure helpers (`youtube.ts`, `songWriters.ts`, `wikipedia.ts`/`musicbrainz.ts` if pure — check for fetch calls; if they fetch, they move too). Update imports; record the rule in AGENTS.md's layout section (`lib` = effectful/stateful, `utils` = pure functions) in the same change. Can be combined with the components-folder move commit-series but keep each move commit pure.

### Rename the match-suggestion pair — **deferred (Decision F)** — do not do until the matching rework

### Split detail-content controllers (later, opportunistic)

`SongDetailContent.tsx` (535 lines) and `RecordingDetailContent.tsx` (485) mix data fetching, save/dirty tracking, and rendering. Direction: extract the fetch/save logic into hooks in `src/hooks/` (e.g. `useSongDetail`, `useRecordingDetail`) when next doing substantial work in these files. Not worth a standalone churn-only PR.
