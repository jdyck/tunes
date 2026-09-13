# Current project stage

- **Current stage:** privacy-active
- **Last reviewed:** 2026-09-12

This is the repository's mutable operational-status document, not an ADR. It answers what privacy and migration assumptions are valid **right now**. Update it immediately when the project crosses one of the transition triggers below; do not preserve old stage text here for history.

## What the current stage means

- The only Users are the owner, a small number of personally known, explicitly invited testers, and two owner-authorized agent test accounts restricted to the development environment ([local development access](agents/local-dev-access.md)).
- User-scoped content is expected to remain private from every other User. This includes notes, tags, saved Recordings, and private Song Files.
- The owner's hosted development deployment may contain a temporary clone of
  production data. Treat those rows and snapshots under `local/backups/` as
  private production data.
- Data migrations must preserve the confidentiality boundary for User-scoped data throughout the migration, not only at its final schema shape. Review a migration's read paths, temporary data, and authorization before running it.
- Existing Song and Recording data is useful and should be preserved by default. Never discard, corrupt, or merge rows silently; explain the concrete benefit and get explicit approval for the destructive step first.
- Authentication credentials, API keys, and other secrets are always sensitive.

The target domain model is now also the operating privacy posture:
`songUserData`, `artistUserData`, `userRecordingData`, and Song Files remain
private per User, with server-enforced authorization and owner-scoped
application queries in place. The private-by-default and admin-gated publishing
rule for Song Files remains in force.

## Privacy-active checklist for expanded access

Any later expansion of access must preserve this posture; do not downgrade it
merely because the app remains small or invite-only.

Before admitting a new category of expected-private content, or a User outside
the current invited group:

1. Review any unfinished schema/data-migration plan for data exposure or mixed
   ownership, and revise it before the content or User is admitted.
2. Verify backend authorization and application queries with at least two Users
   for every affected private table and delivery path.
3. Update any plan or direction document that still assumes trusted-test data
   can be visible across Users.
