# AGENTS.md

Instructions for AI coding agents working in this repo. Keep this file lean — for domain language and rationale, follow the links out to `docs/`, don't duplicate them here.

## Project overview

Standards (repo folder: `tunes`): a personal Next.js/Supabase app for tracking a solo musician's repertoire (Songs), private `song_user_data`, and saved Recordings with private `user_recording_data` — separate from casual playlists. Solo personal project, early stage, dormant between sessions. See [docs/domain-model.md](docs/domain-model.md) for why it exists and the domain vocabulary.

The current deployment/privacy phase is maintained in [docs/project-stage.md](docs/project-stage.md). Read it before schema, RLS, auth, or data-migration work. Its current-stage status controls whether temporary migration exposure is an accepted development tradeoff; it does not override the target private-data boundaries in the domain model and ADRs.

## Repo layout

```
src/app/             Next.js App Router (route = folder path)
  (browse)/            main app shell: songs list + parallel panes (ADR-0005)
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
src/lib/             effectful/stateful modules — anything that fetches, talks to supabase, or holds state (supabaseClient, fonts, metadata clients, componentRegistry)
src/types/           shared TS types
src/utils/           pure functions only
docs/                domain model, ADRs, direction notes (issues + ideas by subject) — see docs/README.md
```

The folder scheme and lib/utils rule above are deliberate decisions (recorded in [docs/direction/code-organization.md](docs/direction/code-organization.md)) — place new files accordingly, and check that doc before further structural changes.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`) — auth + Postgres, client in `src/lib/supabaseClient.ts`; schema migrations in `supabase/migrations/` (applied with `npx supabase db push`)
- Persistent custom player for Recordings, backed by the YouTube IFrame API (`src/components/player/GlobalPlayer.tsx`, `src/lib/youtube.ts`) — see [docs/direction/music-player.md](docs/direction/music-player.md)

## Commands

```
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm test         # run the focused TypeScript test suite
npm run start    # run production build
```

The focused test suite covers pure normalization and MusicBrainz matching
contracts; broader component/browser testing remains undecided. See
[docs/direction/testing.md](docs/direction/testing.md).

Login credentials for local dev are in `.env.local` (not checked in).

## Flagged findings and plans to review

Use the git-ignored `notes/` folder as a local review workspace before extensive work becomes an implementation task:

- `notes/flagged.md` is the index of observed gaps between the documentation and the current code. A finding records evidence and why the mismatch matters; it is not approval to fix the issue and should not grow into a detailed implementation plan.
- For extensive work (for example, a schema migration, architectural change, risky cross-feature change, or coordinated multi-file refactor), create one focused draft in `notes/plans-to-review/<descriptive-slug>.md`. Link that path from the corresponding finding in `notes/flagged.md` rather than embedding the whole plan there.
- A draft plan should state its status, the problem and documentation involved, current-code evidence, intended outcome, scope and non-goals, implementation phases or steps, risks and open questions, verification, and required documentation cleanup. Keep decisions that still need the owner's input visibly unresolved.
- Treat `notes/plans-to-review/` as a human-review checkpoint. The owner may edit a plan directly or revise it through an AI conversation. Unless the owner explicitly requests planning and implementation together, stop after drafting or revising the plan; the existence of a plan alone does not authorize implementation.
- When the owner approves a plan and asks for implementation, confirm whether the request covers the whole plan or named parts, then use the reviewed plan as the working scope. Re-check its assumptions against the current code before changing anything, and keep unfinished phases accurate if only part of the plan is attempted.
- Plans in `notes/` are provisional and are not the repository's source of truth. As implementation settles direction, reflect lasting decisions in the appropriate committed docs or ADRs. Delete a completed, rejected, or superseded review plan when it no longer provides useful in-progress context; keep or revise a partially implemented plan so its remaining work is clear.

## Rules and guardrails

- **Terminology and Song boundary**: "Song", never "Tune" ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)). The rename and Song / `song_user_data` split are complete through code and DB: shared identity and metadata live on `public.songs`, while membership, notes, display title, and added time live in private `song_user_data`. Don't reintroduce "tune" or owner/private payload on `songs`.
- **Canonical entity migrations are scoped work, not drive-bys**: Artist includes people and groups; Recording is provider-neutral; private Recording state belongs in `user_recording_data`; YouTube results belong in `youtube_items`; and Original/Primary Release point to shared Release Groups. The current schema has not caught up — follow [ADR-0008](docs/adr/0008-provider-neutral-music-entities-and-user-data.md) and [canonical-entity-migrations.md](docs/direction/canonical-entity-migrations.md) rather than extending transitional tables as if they were final.
- **Song creation is not admin-gated**: any user can create a new Song on no search match; don't add approval/moderation gates here ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)).
- **Lead Sheets are private by default and publishing is admin-only**, never self-service or automatic — don't build a user-facing "publish" action ([ADR-0002](docs/adr/0002-lead-sheets-admin-gated-publishing.md)).
- **One email = one account** across auth methods (password + Google) — don't treat them as separate identities ([ADR-0001](docs/adr/0001-unique-email-account-linking.md)).
- **Only the owner commits — never an agent.** Agents stage changes (`git add`) and suggest a `git commit -m` message for the owner to run; never run `git commit` (or push, amend, etc.) themselves. When the work reaches a point where a commit seems like a good idea, proactively suggest one; if unsure whether it's commit-worthy, ask.
- **Keep docs handoff-ready at all times.** The owner returns after long gaps and any session may be the last before a handoff, so update the relevant docs (`docs/direction/`, ADRs, this file, `docs/domain-model.md`) *as part of the work*, not as a follow-up: scope changes, decisions made, and completed/obsolete tasks must be reflected before the session ends. If a session were interrupted right now, the docs — not the conversation — must be enough for the next agent to pick up. Handoff context that shouldn't be committed (in-progress state, half-formed plans) goes in the git-ignored `notes/` folder.
- **Docs record direction and decisions, not history.** When work scoped in [docs/direction/](docs/direction/) is completed, *delete* that task/section (git history is the record — no "DONE" markers accumulating). Standing decisions worth keeping get an ADR; a direction file whose content is all completed gets deleted.
- Before "fixing" something you notice in passing, check [docs/direction/](docs/direction/) for a file on that subject — it may already be a known, deliberately-not-yet-fixed issue, or something the owner has other plans for. A hit there needs a conversation, not a silent fix.
- This is a solo hobby project the owner returns to after long gaps and is also using to learn broader dev practices — prefer clear, conventional patterns over clever ones, and explain non-obvious choices.
