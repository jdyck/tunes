# Dedicated development accounts for agent verification

**Status:** Accepted 2026-08-27

## Decision

Agents verify the local app with two dedicated Clerk development Users: an
ordinary User by default and a separate User with the Convex admin role for
admin checks. A local command uses Clerk Agent Tasks to establish short sessions
for those fixed identities. It rejects production configuration and unexpected
accounts or destinations. No authentication bypass is added to the application.

Setup and fixtures are explicit, idempotent development operations. The internal
Convex seed is restricted to the known personal development deployment and
creates clearly labeled sample content without copying the owner's private
repertoire. Shared facts and private User data retain the usual authorization.

## Rationale and consequences

Personal Google sign-in is an unnecessary dependency for routine UI checks.
Using real Clerk sessions exercises the Clerk-to-Convex integration while making
the test identity and permissions predictable. An admin-only test identity would
hide ordinary-user authorization failures; both roles are needed.

Clerk Agent Tasks are beta and currently grant the chosen User's full permissions.
Dedicated identities, local target checks, private ticket files, and short session
duration bound that access. Browser security approvals still apply. Production
keys, real User impersonation, anonymous dev-login routes, and disabled auth are
outside this decision. Automated Playwright/CI adoption remains separate work.

Account identities and the expected development target are private environment
configuration, not constants in source. The local command reads `.env.local`;
the internal seeder reads matching typed Convex environment values and refuses
missing or mismatched settings. Tests use fictional identities. Moving values
out of source is not an authentication boundary, so persistent agent identities
must use normally deliverable addresses. The configuration rejects Clerk's
`+clerk_test` fixed-code address pattern.

See [local development access](../agents/local-dev-access.md) for the procedure.
