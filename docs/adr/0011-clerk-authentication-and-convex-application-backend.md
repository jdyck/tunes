# Clerk authentication and Convex application backend

**Status:** Accepted 2026-08-17

## Decision

Standards uses Clerk for authentication and invite-only account admission, and
Convex for application data, authorization, reactive queries, mutations,
actions, and future application-managed storage. Supabase is no longer an
application runtime.

Clerk establishes identity. Convex functions derive that identity from
`ctx.auth`; clients never supply a trusted User identifier. Every public Convex
function must enforce authentication and its record-level ownership or role
rules before reading or writing private data. Backend-only migration and
administrative operations use internal functions.

Clerk and Convex development and production environments remain separate.
Development data is not promoted as an ordinary release mechanism. The legacy
Supabase project remains the migration source and rollback evidence until the
owner's final snapshot has been imported into Convex production and the cutover
has been verified. Production creation and mutation are a separate, explicitly
approved operation.

This ADR supersedes only the Supabase/RLS implementation details in ADR-0001
and ADR-0008. Their identity, canonical-entity, and private User-data decisions
remain in force.

## Why

The replacement branch implemented the complete current runtime, removed all
reachable Supabase dependencies, and passed the focused tests and production
build. A repeatable export/import rehearsal preserved all shared data plus the
owner's private Song and Recording data, and a second import proved idempotent.
A browser smoke with two real Clerk Development Users proved that a shared Song
can be discovered without exposing the owner's favorite, notes, Recordings, or
Site Admin controls.

The owner prefers the Clerk and Convex development experience and free-tier
posture for this solo, intermittently used project. In particular, avoiding the
Supabase Free project's inactivity pause is valuable. The extra operational
surface of two services is acceptable at this scale.

## Consequences

- Convex has no database-enforced equivalent of Supabase RLS. Authorization is
  an application invariant and must remain centralized, consistently applied,
  and covered by negative tests for anonymous and non-owner identities.
- Clerk owns account identity and access policy only. Application roles and all
  repertoire data remain in Convex.
- Development and production require separate Clerk/Convex configuration,
  issuer values, Users, data imports, and verification.
- Supabase migrations and the live source project remain temporarily for the
  production owner-data cutover and audit. Their later removal is separately
  scoped cleanup, not part of adopting this ADR.
- Raw Convex storage URLs are bearer URLs. Before private Lead Sheets or other
  revocable files are implemented, storage delivery must receive a separate
  privacy design rather than assuming those URLs enforce per-request access.
- The Supabase implementation is the rejected runtime alternative. It remains
  the rollback source until production cutover succeeds; the branch is no
  longer an undecided experiment.
