# Code organization: components grouped by feature; lib = effectful, utils = pure

Two standing rules for where source files live, decided together (July 2026) when the flat `src/components/` folder (30 files) got hard to navigate.

**Components are grouped by feature, plus two structural folders**: `components/ui/` (generic primitives — Spinner, Modal, FormField, LinkButton — plus cross-feature domain bits like MusicBrainzLink that both song and recording features use), `components/layout/` (shells, panes, gates), and one folder per feature (`song/`, `recording/`, `player/`). Upcoming features — Playlists (ordered subsets of a user's songs) and Lead Sheets (user-uploaded + public-domain charts, [ADR-0002](0002-lead-sheets-admin-gated-publishing.md)) — get their own folders when they arrive, so the scheme scales by feature rather than by file count.

**`src/lib` holds anything effectful or stateful** (I/O, fetch wrappers, supabase access, singletons, config); **`src/utils` holds pure functions only**. The rule is deliberately mechanical — an agent or future self can apply it without judgment: if it fetches, talks to supabase, or holds state, it's `lib`. The stateful/networked YouTube Music client therefore lives in `src/lib/ytmusic.ts`; provider clients are not exceptions to the rule (see [code-organization.md](../direction/code-organization.md)).

## Considered

- Keeping components flat — rejected: at 30 files the folder no longer communicated which components were reusable primitives vs feature internals.
- `ui/` + `layout/` only, rest flat — rejected in favor of feature folders because the planned features (playlists, lead sheets) map naturally onto folders.
- Redefining `lib` as "singletons only" and leaving fetch wrappers in `utils` — rejected: avoids a few file moves but leaves a fuzzy boundary that will drift again; pure-vs-effectful is crisp.

## Consequences

- New files must be placed by these rules (see AGENTS.md repo layout); a mixed pure/effectful module belongs in `lib`, or gets split.
- Shared-across-features components sit in `ui/` even when domain-specific; if that population grows, a dedicated folder can be reconsidered.
