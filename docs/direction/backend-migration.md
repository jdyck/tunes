# Clerk and Convex backend migration

The Clerk/Convex architecture is adopted by
[ADR-0011](../adr/0011-clerk-authentication-and-convex-application-backend.md).
The application runtime uses Clerk for authentication and Convex for
application data. The existing Supabase project remains the source of truth for
the owner's real repertoire until its data has been imported into Convex
production and verified. Do not delete or modify that project as cleanup work.

## Current checkpoint

The snapshot at `local/snapshots/supabase-20260817T043229Z` contains 3,758 rows
across all 12 application tables. Its manifest checksums and source foreign
references pass. The personal development deployment `glad-shark-997` imported
all shared rows plus the Site Admin owner's 151 Song-private and 479
Recording-private rows. Two private rows belonging to a legacy non-admin test
identity remain preserved only in the snapshot.

A complete second import inserted zero documents and passed the same expected
counts, proving the import is restartable. The authenticated application showed
152 Songs (151 imported plus the existing development fixture), opened an
imported favorite Song with its three ordered Recordings, and reported no
browser errors.

A second real Clerk Development User began with an empty repertoire, found the
same imported discoverable Song, and added it. That User saw zero Recordings, an
unset favorite, empty private notes, and no Site Admin discoverability control.
Returning to the owner restored the favorite, all three ordered Recordings, and
the Site Admin control. This completes the real two-User isolation smoke; the
owner session is restored. Browser diagnostics contained no application errors.

The production foundation now exists but cutover has not happened. Clerk
Production was created for `tunes-seven.vercel.app` by cloning the Invite-only
Development settings. Convex production `warmhearted-dog-849` has the current
schema and functions plus
`CLERK_JWT_ISSUER_DOMAIN=https://clerk.tunes-seven.vercel.app`. Its application
tables are empty. Vercel Production has the matching live Clerk publishable and
secret keys plus `NEXT_PUBLIC_CONVEX_URL` for that Convex deployment. The
frontend has not yet been redeployed with these values; no owner data has been
imported and Supabase remains the source of truth.

## Portable source snapshot

Run this from the repository root while the Supabase project is not receiving
writes:

```bash
npm run export:supabase
```

The exporter reads `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from the environment or `.env.local`. It writes one
JSON file per public application table plus `manifest.json` beneath the ignored
`local/snapshots/` directory. The manifest records the export time, source schema
version, per-table row counts, byte sizes, and SHA-256 checksums. The exporter
reads every table in exact-count pages and verifies each file after writing it.

The snapshot deliberately excludes Supabase Auth users, passwords, sessions,
keys, and other secrets. Clerk identities are created separately. Application
User ownership UUIDs remain in the exported rows so the Convex importer can bind
the owner's legacy data to the correct Convex User.

Supabase REST reads are not one cross-table transaction. Keep the application
idle during the export, and take a fresh snapshot after freezing Supabase writes
for the eventual production cutover.

## Import procedure

The idempotent, internal-only importer maps Supabase UUID relationships to native
Convex document IDs in dependency order and verifies imported counts against the
source manifest:

  ```bash
  npm run import:convex -- \
    --snapshot local/snapshots/<snapshot-directory> \
    --deployment <personal-dev-deployment>
  ```

- The importer binds the one legacy `site_admins` UUID to the one Convex Site
  Admin User. It imports only that owner's private rows. Any other legacy User's
  private rows remain preserved in the source snapshot and are reported rather
  than silently reassigned.
- Legacy Recording kinds that are absent use the application's established
  `video_capture` fallback. Because legacy private Recording positions may be
  absent, the importer deterministically normalizes each Song's owner-specific
  ordering while preserving explicitly ordered rows ahead of unordered rows.
- `user_recording_data` has no creation timestamp. Its imported `createdAt`
  records the source snapshot time; ordering does not depend on this fallback.

## Remaining migration work

- Finish Clerk Production setup: add production Google OAuth credentials,
  deploy the frontend, configure and verify the production app proxy, and create
  the invited owner User. Ensure that User exists in Convex and promote it to
  Site Admin before importing owner-scoped data.
- Before production cutover, freeze Supabase writes, take a fresh snapshot,
  import it into Convex production, and verify normal workflows before entering
  new repertoire data.

Historical Supabase migrations and snapshots remain migration/rollback evidence
until the production cutover is verified and cleanup is separately approved.
