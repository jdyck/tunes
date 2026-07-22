# Standards

A personal tool for tracking a musician's repertoire — songs, personal notes, and liked recordings — kept separate from casual listening playlists. Solo project, early stage.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase (auth + Postgres).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing on your phone

The dev server has no HTTPS cert for your local network IP, which breaks on iOS. Easiest fix is a quick tunnel instead:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Open the printed `https://*.trycloudflare.com` URL on your phone. The link is a random, unlisted subdomain — fine to use solo or share with a few trusted people, but kill the tunnel (`Ctrl-C`) when you're done rather than leaving it running.

You'll need a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
YOUTUBE_API_KEY=
```

`YOUTUBE_API_KEY` is server-only. Do not expose it with a `NEXT_PUBLIC_`
prefix; both YouTube search and selected-video enrichment run through server
routes.

## Learn more about this project

- [docs/project-stage.md](docs/project-stage.md) — current development/tester phase and the trigger for switching to privacy-active operation.
- [docs/README.md](docs/README.md) — index of domain model, architecture decisions, and notes on where the project is headed.
- [AGENTS.md](AGENTS.md) — instructions for AI coding agents working in this repo.
