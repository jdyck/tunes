# AGENTS.md

Instructions for AI coding agents working in this repo. Keep this file lean — for domain language and rationale, follow the links out to `docs/`, don't duplicate them here.

## Project overview

Standards (repo folder: `tunes`): a personal Next.js/Supabase app for tracking a solo musician's repertoire (Songs), personal notes on each (User Songs), and liked recordings — separate from casual playlists. Solo personal project, early stage, dormant between sessions. See [docs/domain-model.md](docs/domain-model.md) for why it exists and the domain vocabulary.

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
src/utils/           pure functions only (e.g. ytmusic.ts)
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
npm run start    # run production build
```

No test suite exists yet (see [docs/direction/testing.md](docs/direction/testing.md)).

Login credentials for local dev are in `.env.local` (not checked in).

## Rules and guardrails

- **Terminology**: "Song", never "Tune" ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)). The rename is complete through code and DB (`public.songs`, `song_id`); don't reintroduce "tune". The remaining Song / User Song *table split* is a future scoped migration ([docs/direction/song-user-song-split.md](docs/direction/song-user-song-split.md)) — not a drive-by.
- **Song creation is not admin-gated**: any user can create a new Song on no search match; don't add approval/moderation gates here ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)).
- **Lead Sheets are private by default and publishing is admin-only**, never self-service or automatic — don't build a user-facing "publish" action ([ADR-0002](docs/adr/0002-lead-sheets-admin-gated-publishing.md)).
- **One email = one account** across auth methods (password + Google) — don't treat them as separate identities ([ADR-0001](docs/adr/0001-unique-email-account-linking.md)).
- **Only the owner commits — never an agent.** Agents stage changes (`git add`) and suggest a `git commit -m` message for the owner to run; never run `git commit` (or push, amend, etc.) themselves. When the work reaches a point where a commit seems like a good idea, proactively suggest one; if unsure whether it's commit-worthy, ask.
- **Keep docs handoff-ready at all times.** The owner returns after long gaps and any session may be the last before a handoff, so update the relevant docs (`docs/direction/`, ADRs, this file, `docs/domain-model.md`) *as part of the work*, not as a follow-up: scope changes, decisions made, and completed/obsolete tasks must be reflected before the session ends. If a session were interrupted right now, the docs — not the conversation — must be enough for the next agent to pick up. Handoff context that shouldn't be committed (in-progress state, half-formed plans) goes in the git-ignored `notes/` folder.
- **Docs record direction and decisions, not history.** When work scoped in [docs/direction/](docs/direction/) is completed, *delete* that task/section (git history is the record — no "DONE" markers accumulating). Standing decisions worth keeping get an ADR; a direction file whose content is all completed gets deleted.
- Before "fixing" something you notice in passing, check [docs/direction/](docs/direction/) for a file on that subject — it may already be a known, deliberately-not-yet-fixed issue, or something the owner has other plans for. A hit there needs a conversation, not a silent fix.
- This is a solo hobby project the owner returns to after long gaps and is also using to learn broader dev practices — prefer clear, conventional patterns over clever ones, and explain non-obvious choices.
