# Clerk authentication and Convex application backend

**Current implementation note (August 2026):** Production cutover, owner-data
import, and production verification are complete. The completed migration
direction and local implementation plan have been removed. Supabase was the
first backend service tried for this project. It was abandoned because its
free tier pauses projects during periods of low usage. The current runtime uses
Clerk and Convex.

**Status:** Accepted 2026-08-17

## Decision

Standards uses Clerk for authentication and invite-only account admission, and
Convex for application data, authorization, reactive queries, mutations,
actions, and future application-managed storage.

Clerk establishes identity. Convex functions derive that identity from
`ctx.auth`; clients never supply a trusted User identifier. Every public Convex
function must enforce authentication and its record-level ownership or role
rules before reading or writing private data. Backend-only migration and
administrative operations use internal functions.

Clerk and Convex development and production environments remain separate.
Development data is not promoted as an ordinary release mechanism. Production
creation and mutation are a separate, explicitly approved operation.

The identity, canonical-entity, and private User-data decisions in ADR-0001 and
ADR-0008 remain in force.

## Why

The replacement implementation passed the focused tests and production build.
A browser smoke with two real Clerk Development Users proved that a shared Song
can be discovered without exposing the owner's favorite, notes, Recordings, or
Site Admin controls.

The owner prefers the Clerk and Convex development experience and free-tier
posture for this solo, intermittently used project. The extra operational
surface of two services is acceptable at this scale.

## Consequences

- Convex has no database-enforced equivalent of row-level security.
  Authorization is an application invariant and must remain centralized,
  consistently applied, and covered by negative tests for anonymous and
  non-owner identities.
- Clerk owns account identity and access policy only. Application roles and all
  repertoire data remain in Convex.
- A Clerk production-domain change preserves the User subject but changes the
  issuer-qualified token identifier. `users.ensureCurrent` therefore rebinds an
  existing User with the same Clerk subject to the new token identifier rather
  than creating a second application User and orphaning their private data.
- Development and production require separate Clerk/Convex configuration,
  issuer values, Users, data imports, and verification.
- Raw Convex storage URLs are bearer URLs. Before private Lead Sheets or other
  revocable files are implemented, storage delivery must receive a separate
  privacy design rather than assuming those URLs enforce per-request access.
