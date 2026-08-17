# Clerk and Convex backend migration

The application runtime uses Clerk for authentication and Convex for application
data. The existing Supabase project remains the source of truth for the owner's
real repertoire until its data has been imported into Convex and verified.
Do not delete or modify that project as cleanup work.

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

## Remaining migration work

- Build an idempotent, internal-only importer that maps Supabase UUIDs to native
  Convex document IDs in dependency order.
- Rehearse the import against the Convex development deployment and verify every
  manifest count, ownership relationship, foreign reference, and Site Admin
  assignment.
- Repeat the export from the unchanged Supabase source if rehearsal discovers a
  mapping problem.
- Before production cutover, freeze Supabase writes, take a fresh snapshot,
  import it into Convex production, and verify normal workflows before entering
  new repertoire data.

Historical Supabase migrations and snapshots remain migration/rollback evidence
until the Clerk/Convex architecture is adopted and cleanup is separately
approved.
