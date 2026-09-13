# Standards

A personal tool for tracking a musician's repertoire — songs, personal notes, and liked recordings — kept separate from casual listening playlists. Solo project, early stage.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Clerk authentication,
and Convex.

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

Connect the repository to a Convex development deployment with `npx convex dev`,
configure that deployment's `CLERK_JWT_ISSUER_DOMAIN`, and provide these local
environment variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CONVEX_URL=
YOUTUBE_API_KEY=
```

`YOUTUBE_API_KEY` is server-only. Do not expose it with a `NEXT_PUBLIC_`
prefix; both YouTube search and selected-video enrichment run through server
routes.

### Private Song File uploads

Song File uploads use authenticated Convex HTTP actions. Set the
development deployment's `APP_ORIGIN` to the exact local Next.js origin before
using them:

```bash
npx convex env set APP_ORIGIN http://localhost:3000
```

For a Cloudflare quick tunnel, temporarily use that exact HTTPS tunnel origin
instead. Never use `*`; the file actions accept only one configured browser
origin. Configure the matching production origin separately during a
production-release task.

### Refreshing hosted development data from production

This owner-only command copies one User's production data into the hosted
Convex development deployment used by local Next.js. Production is read-only;
the development application tables are replaced.

Create `.env.data-pull.local` from
[`docs/examples/data-pull.env.example`](docs/examples/data-pull.env.example),
fill in its three values, and run `chmod 600 .env.data-pull.local`.

Then run:

```bash
npm run data:pull:dry-run
npm run data:pull
```

Both commands ask for confirmation and save private snapshots under ignored
`local/backups/`. Those ZIPs contain real production data; delete them when they
are no longer useful. See
[local development access](docs/agents/local-dev-access.md#production-to-development-data-pull)
for safeguards and recovery.

## Learn more about this project

- [docs/project-stage.md](docs/project-stage.md) — current development/tester phase and privacy-active operating posture.
- [docs/README.md](docs/README.md) — index of domain model, architecture decisions, and notes on where the project is headed.
- [AGENTS.md](AGENTS.md) — instructions for AI coding agents working in this repo.
