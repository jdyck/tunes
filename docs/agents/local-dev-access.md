# Local development access

For agent browser verification, use the dedicated Clerk development accounts
through `npm run dev:login`. Read this before local sign-in, account provisioning,
or responding to an authentication blocker. The decision is in
[ADR-0013](../adr/0013-dedicated-agent-development-accounts.md).

## Account identity security

The two persistent agent Users use distinct, normally deliverable email
addresses with normal Clerk delivery and recovery behavior. Never use Clerk's
`+clerk_test` address pattern for these identities: development instances accept
a fixed verification code for that pattern, so hiding the exact address is not
an authorization boundary. Local and server-side configuration validation reject
it. See [Clerk test-email behavior](https://clerk.com/docs/guides/development/testing/test-emails-and-phones).

`.env.local` and `local/dev-auth/` must remain private. Deployment URLs and the
login-tool source are not credentials. Audit tracked files and Git history before
publishing an existing repository; ignore rules do not remove previously
committed secrets.

## Private configuration

The seven `DEV_AGENT_*` values live in ignored `.env.local`, alongside the
existing Clerk keys. Use [the blank example](../examples/dev-agent.env.example)
to identify the required fields. Account emails, external IDs, and the expected
development target have no source-code defaults. Missing settings, production
targets, mismatched deployment URLs, and conflicting process overrides fail
closed. These values must never use the `NEXT_PUBLIC_` prefix.

The internal seeder reads matching typed environment variables from its Convex
deployment. They are optional at deployment time so production does not need
them, but all are required when the seed runs. Keep the development-only copy
in `local/dev-auth/seed.env`; it contains only the seven `DEV_AGENT_*` settings,
not the Clerk secret key. After announcing the development target, upload with
`npx convex env set --from-file local/dev-auth/seed.env --env-file local/dev-auth/convex.env`.
The selector file must contain only the reviewed `CONVEX_DEPLOYMENT` value.
Do not copy these variables to production or use `--force` to conceal a conflict.

Generated account IDs and login tickets remain runtime state in
ignored `local/dev-auth/`, not committed configuration.

## Normal browser verification

1. Start the app with `npm run dev`, or use the existing local server.
2. Run `npm run dev:auth-status` to check the pinned Clerk identities. A missing
   configuration needs the provisioning procedure below, not a personal login.
3. Run `npm run dev:login -- user`. Choose `admin` only for an admin-specific
   check, such as populating Artist metadata caches. The optional second argument
   is a local Songs/Artists URL, for example `http://localhost:3001/artists`.
4. The command prints a path to `local/dev-auth/login-user.json` (or
   `login-admin.json`). Read its `url` into the supported browser tool without
   printing the JSON or URL into the conversation. It contains a login ticket;
   follow the browser tool's login and sensitive-data approval requirements.
   The script deliberately does not launch a different browser or alter cookies.
5. Verify the account from the app's Account menu (on the home screen when the
   narrow layout hides the sidebar) and verify that the demo Songs load.
   This proves more than merely reaching Clerk's redirect URL: the app
   must accept the Clerk session and the Convex User must initialize correctly.
6. Check private-data and role boundaries using the other account when relevant.
   Log out through the app after testing and confirm the sign-in screen appears;
   a new login command revokes any previous unused ticket for that account before
   creating a fresh session with a 30-minute maximum duration.

If the browser denies access or asks for approval, stop that browser operation
and ask the owner. Do not switch tools or accounts to evade the decision.
No password, Google login, cookie export, or auth-bypass endpoint is needed.

## Provisioning or repair

Account creation and the dev admin role need owner approval. Normal feature work
uses the existing accounts. After approval:

1. Check `.env.local` and announce the exact Clerk/Convex development target.
   The `DEV_AGENT_*` settings define the expected target and account identities;
   production keys, hosted execution, and deployment-key overrides are refused.
2. Configure the matching private Convex environment values as described above,
   then deploy `convex/devAgents.ts` to the reviewed development deployment using
   the normal guarded Convex dev workflow.
3. Run `npm run dev:accounts`. It verifies the Clerk instance and frontend domain,
   creates/reuses exactly two marked test accounts, pins their IDs locally, and
   invokes the internal, dev-restricted fixture seed. Use account emails with
   normal delivery and secure recovery. Generated passwords are discarded;
   login uses Clerk Agent Tasks.
4. Run setup again to verify idempotence. Existing private notes are preserved;
   this is additive setup, not a reset. Renamed/deleted fixture content may need
   review before reseeding. No existing account is adopted based only on email.
   A session may omit the email claim; reseeding permits an already-matching
   identity and role with a null email, but never uses that to change its role.

To rotate an account email, keep its Clerk User ID, external ID, private role
marker, and Convex User unchanged. Replace the email identifier in Clerk, update
the local and development-deployment `DEV_AGENT_*_EMAIL` values, deploy the
validated seeder, and run setup twice. The seeder permits an email-only change
for an already-matching subject, token identity, and role; it refuses changing
both email and role in one operation.

The ordinary account is the default. The admin account has the application's
Convex admin role, not access to Clerk's dashboard or production. Both receive
one shared demo Song and one private demo Song apiece, with different private
notes and two saved, silent Recording placeholders. Fixture names start with
`Agent demo:`. The demo Recordings reference The Beatles and Paul McCartney to
exercise group/individual browsing; they are not real catalog Recording claims.
They have no playable provider item and the demo Songs are not discoverable.

`local/dev-auth/` is ignored and restricted to its filesystem owner. It contains
the pinned IDs and generated login tickets; keep it out of commits and shared
logs. Keys stay in `.env.local`. `npm run dev:revoke-login -- user` invalidates
the current **unused** login task. Creating a replacement login first revokes
the previous pending task; if Clerk reports that it was already consumed or
otherwise inactive, setup continues without treating it as a pending credential.
If saving a newly created private ticket fails, the command revokes that task
before returning an error. Clerk may reject explicit revocation after a ticket
has been consumed (`agent_task_cannot_be_revoked`); use app logout to end an
established browser session. Do not report a consumed ticket as revoked.

## Boundaries

- The script only permits the two pinned identities after checking their exact
  email, external ID, and private Clerk marker. No arbitrary user-ID option.
- Clerk Agent Tasks are beta and currently permit only `permissions: '*'`.
  Least privilege comes from the selected test account and existing Convex
  authorization, not from an invented task permission scope.
- Login URLs must come from the pinned Clerk development issuer; redirect URLs
  must be local HTTP Songs/Artists pages. The seed also rejects any other
  Convex URL or Clerk issuer on the server.
- This workflow does not enable a broad browser-test framework or hosted CI.
  Normal auth-flow tests still exercise the actual sign-in UI separately.

Sources: [Clerk Agent Tasks](https://clerk.com/docs/guides/development/testing/agent-tasks),
[test email addresses](https://clerk.com/docs/guides/development/testing/test-emails-and-phones).

## Production-to-development data pull

`npm run data:pull` copies one configured production User into the configured
browser User on the pinned hosted development deployment. It never writes to
production, imports only application tables, and restores the dedicated agent
fixtures afterward. `npm run data:pull:dry-run` validates the same mapping
without replacing development data.

Both commands show their exact targets and require confirmation. Production
and pre-pull development snapshots are retained with private permissions under
ignored `local/backups/`; the filtered import excludes file storage, Song File
metadata, component data, and deployment-local Artist-reconciliation jobs. It
copies only the selected User's private Artist repertoire projection rows, so
the imported Artist views remain usable without replaying another deployment's
scheduled work. The retained backups are full source and destination exports
made before filtering, so they can include Song File metadata. The pull refuses
a development target containing Song File rows;
delete those private development files in the app before pulling rather than
creating dangling storage references. If a replacement fails after it starts
clearing tables, rerun it or restore the saved pre-pull development ZIP.
Configuration and commands are documented in the root README.
