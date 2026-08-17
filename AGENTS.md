# AGENTS.md

Instructions for AI coding agents working in this repo. Keep this file lean — for domain language and rationale, follow the links out to `docs/`, don't duplicate them here.

## Project overview

Standards (repo folder: `tunes`): a personal Next.js app using Clerk and Convex
to track a solo musician's repertoire (Songs), private Song data, and saved
Recordings with private User data—separate from casual playlists. Solo personal
project, early stage, dormant between sessions. See
[docs/domain-model.md](docs/domain-model.md) for why it exists and the domain
vocabulary.

The current deployment/privacy phase is maintained in [docs/project-stage.md](docs/project-stage.md). Read it before schema, authorization, auth, or data-migration work. Its current-stage status controls whether temporary migration exposure is an accepted development tradeoff; it does not override the target private-data boundaries in the domain model and ADRs.

## Repo layout

```
src/app/             Next.js App Router (route = folder path)
  (browse)/            main app shell: persistent list + parallel detail panes (ADR-0010)
    @detail/song/[id]/           a Song's detail pane
      @recording/recording/[recordingId]/   nested Recording pane
    @detail/dev/components/      dev-only component gallery (one page per registry entry)
    songs/               songs list route
  login/, signup/, forgot-password/, account/   auth + account pages
  api/                 metadata proxy routes (song-metadata, recording-metadata, youtube-search)
src/components/      shared React components, grouped by feature
  ui/                  generic primitives (Spinner, Modal, FormField…) + cross-feature domain bits (MusicBrainzLink)
  layout/              shells, panes, gates (BrowseLayoutShell, DetailPaneGate…)
  player/              GlobalPlayer + its gate
  song/, recording/    feature components; future features (playlists, lead sheets) get their own folder
src/hooks/           shared React hooks
src/lib/             effectful/stateful modules — anything that fetches or holds state (fonts, metadata clients, componentRegistry)
src/types/           shared TS types
src/utils/           pure functions only
convex/              schema, authenticated queries/mutations, and model helpers
supabase/            legacy source schema retained only for data migration/audit
docs/                domain model, ADRs, direction notes (issues + ideas by subject) — see docs/README.md
```

The folder scheme and lib/utils rule above are deliberate decisions (recorded in [docs/direction/code-organization.md](docs/direction/code-organization.md)) — place new files accordingly, and check that doc before further structural changes.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS
- Clerk — authentication and invite-only account access
- Convex — application data, authorization, reactive queries, and atomic mutations; read `convex/_generated/ai/guidelines.md` before editing `convex/`
- Supabase migrations and the live source project are retained for the pending
  owner-data import and audit, not as an application runtime; follow
  [docs/direction/backend-migration.md](docs/direction/backend-migration.md)
- Persistent custom player for Recordings, backed by the YouTube IFrame API (`src/components/player/GlobalPlayer.tsx`, `src/lib/youtube.ts`) — see [docs/direction/music-player.md](docs/direction/music-player.md)
- dnd-kit (`@dnd-kit/core`, `/sortable`, `/utilities`) — drag-to-reorder for a User's Recordings within a Song (`src/components/song/RecordingsSection.tsx`). Order is private state: `useSavedRecordings.reorder` calls the owner-scoped `recordings.reorder` mutation; position within a Song must remain private to the User.

## Commands

```
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm test         # run the focused TypeScript test suite
npm run start    # run production build
```

The focused test suite covers pure normalization/MusicBrainz contracts and
Convex authorization behavior; broader component/browser testing remains
undecided. See
[docs/direction/testing.md](docs/direction/testing.md).

Login credentials for local dev are in `.env.local` (not checked in).

## Collaboration workflow

Codex and Claude share this local repository. Follow
[docs/working-with-agents.md](docs/working-with-agents.md), check
`git status --short` before editing and before finishing, and treat unrecognized
changes as owner or other-agent work. Do not revert or overwrite them; inspect
and merge deliberately when work overlaps.

## Local work in progress

Use the git-ignored `local/` workspace for coordination that should not be
repository source of truth:

- `local/wip/flagged.md` records evidence-backed gaps. A finding is not approval
  to fix an issue.
- `local/wip/plans-to-review/` holds plans for extensive or risky work. Include
  status, governing docs and evidence, outcome, scope and non-goals, phases,
  risks and open decisions, verification, and documentation cleanup. A plan is
  not approval to implement it.
- `local/wip/queue.md` is the short, ordered list of owner-reviewed work. Queue
  presence records priority but does not authorize implementation without a
  user request.
- `local/audits/` holds actionable production-content findings;
  `local/snapshots/` holds dated, scoped source-content captures; and
  `local/scratch/` is disposable.

When implementation is requested, confirm whether it covers the whole reviewed
plan or named parts, re-check the plan against current code, and keep unfinished
work accurate. Promote lasting rules, approved direction, reusable procedures,
and settled decisions into committed docs or ADRs. Delete completed, rejected,
or superseded local material when it no longer helps. Because `local/` is not in
Git, back up valuable WIP and audits independently.

## Rules and guardrails

- **Terminology and Song boundary**: "Song", never "Tune" ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)). Shared identity and metadata live on `songs`, while membership, notes, display title, and added time live in private `songUserData`. Don't reintroduce "tune" or owner/private payload on `songs`.
- **Canonical entity migrations are scoped work, not drive-bys**: shared `artists` include people and groups; Song credits live in `songArtistCredits`; private Artist state belongs in `artistUserData`; Recording is provider-neutral; private Recording state belongs in `userRecordingData`; YouTube results belong in `youtubeItems`; and `releaseGroupId` is the Recording's single normalized display/artwork context. Follow [ADR-0008](docs/adr/0008-provider-neutral-music-entities-and-user-data.md) and [canonical-entity-migrations.md](docs/direction/canonical-entity-migrations.md) rather than extending transitional Recording release fields as if they were final.
- **Song creation is not admin-gated**: any user can create a new Song on no search match; don't add approval/moderation gates here ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)).
- **Lead Sheets are private by default and publishing is admin-only**, never self-service or automatic — don't build a user-facing "publish" action ([ADR-0002](docs/adr/0002-lead-sheets-admin-gated-publishing.md)).
- **One email = one account** across auth methods (password + Google) — don't treat them as separate identities ([ADR-0001](docs/adr/0001-unique-email-account-linking.md)).
- **Only the owner commits — never an agent.** Agents stage changes (`git add`) and suggest a `git commit -m` message for the owner to run; never run `git commit` (or push, amend, etc.) themselves. When the work reaches a point where a commit seems like a good idea, proactively suggest one; if unsure whether it's commit-worthy, ask.
- **Keep docs handoff-ready at all times.** The owner returns after long gaps and any session may be the last before a handoff, so update the relevant docs (`docs/direction/`, ADRs, this file, `docs/domain-model.md`) *as part of the work*, not as a follow-up: scope changes, decisions made, and completed/obsolete tasks must be reflected before the session ends. If a session were interrupted right now, the docs — not the conversation — must be enough for the next agent to pick up. Handoff context that shouldn't be committed (in-progress state, half-formed plans) goes in `local/wip/`. Before finishing, explicitly report which docs changed or say `Docs impact: none.` after checking.
- **Docs record direction and decisions, not history.** When work scoped in [docs/direction/](docs/direction/) is completed, *delete* that task/section (git history is the record — no "DONE" markers accumulating). Standing decisions worth keeping get an ADR; a direction file whose content is all completed gets deleted.
- Before "fixing" something you notice in passing, check [docs/direction/](docs/direction/) for a file on that subject — it may already be a known, deliberately-not-yet-fixed issue, or something the owner has other plans for. A hit there needs a conversation, not a silent fix.
- This is a solo hobby project the owner returns to after long gaps and is also using to learn broader dev practices — prefer clear, conventional patterns over clever ones, and explain non-obvious choices.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
