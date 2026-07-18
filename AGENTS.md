# AGENTS.md

Instructions for AI coding agents working in this repo. Keep this file lean — for domain language and rationale, follow the links out to `docs/`, don't duplicate them here.

## Project overview

Tunes: a personal Next.js/Supabase app for tracking a solo musician's repertoire (Songs), personal notes on each (User Songs), and liked recordings — separate from casual playlists. Solo personal project, early stage, dormant between sessions. See [docs/domain-model.md](docs/domain-model.md) for why it exists and the domain vocabulary.

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
src/components/      shared React components (e.g. GlobalPlayer, the persistent player)
src/hooks/           shared React hooks
src/lib/             effectful/stateful modules (supabaseClient, fonts, componentRegistry)
src/types/           shared TS types
src/utils/           pure helpers (e.g. youtube.ts)
docs/                domain model, ADRs, direction notes (issues + ideas by subject) — see docs/README.md
```

Planned/known reorganization of this layout (folder grouping, lib/utils moves, renames) is scoped in [docs/direction/code-organization.md](docs/direction/code-organization.md) — check it before structural changes.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`) — auth + Postgres, client in `src/lib/supabaseClient.js`
- Persistent custom player for Recordings, backed by the YouTube IFrame API (`src/components/GlobalPlayer.tsx`, `src/utils/youtube.ts`) — see [docs/direction/music-player.md](docs/direction/music-player.md)

## Commands

```
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
```

No test suite exists yet (see [docs/direction/testing.md](docs/direction/testing.md)).

Login credentials for local dev are in `.env.local` (not checked in).

## Rules and guardrails

- **Terminology**: use "Song" in new code/UI copy, not "Tune" — the domain was renamed ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)) but some code/DB (`Tune` type, `public.tunes` table) hasn't caught up yet ([docs/direction/song-user-song-split.md](docs/direction/song-user-song-split.md)). Don't treat that existing code as the preferred pattern to copy. The type rename is approved and scoped in [docs/direction/code-organization.md](docs/direction/code-organization.md); the DB split is a separate migration — do either only as its scoped task, not as a drive-by inside other work.
- **Song creation is not admin-gated**: any user can create a new Song on no search match; don't add approval/moderation gates here ([ADR-0003](docs/adr/0003-song-canonical-user-song-personal.md)).
- **Lead Sheets are private by default and publishing is admin-only**, never self-service or automatic — don't build a user-facing "publish" action ([ADR-0002](docs/adr/0002-lead-sheets-admin-gated-publishing.md)).
- **One email = one account** across auth methods (password + Google) — don't treat them as separate identities ([ADR-0001](docs/adr/0001-unique-email-account-linking.md)).
- **Only the owner commits — never an agent.** Agents stage changes (`git add`) and suggest a `git commit -m` message for the owner to run; never run `git commit` (or push, amend, etc.) themselves.
- Before "fixing" something you notice in passing, check [docs/direction/](docs/direction/) for a file on that subject — it may already be a known, deliberately-not-yet-fixed issue, or something the owner has other plans for. A hit there needs a conversation, not a silent fix.
- This is a solo hobby project the owner returns to after long gaps and is also using to learn broader dev practices — prefer clear, conventional patterns over clever ones, and explain non-obvious choices.
