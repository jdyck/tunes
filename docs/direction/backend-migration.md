# Clerk and Convex backend migration

The Clerk/Convex architecture is adopted by
[ADR-0011](../adr/0011-clerk-authentication-and-convex-application-backend.md).
The application runtime uses Clerk for authentication and Convex for
application data. This repo's Supabase configuration, migrations, and the
one-time export/import tooling have been removed (see git history for
`supabase/`, `scripts/export-supabase.mjs`, and
`scripts/import-supabase-to-convex.mjs`) now that the owner's data has been
imported into Convex production, below. The live hosted Supabase project
itself has not been deleted and remains rollback evidence until production is
visually verified — do not delete or modify that project as cleanup work.

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

The production foundation now exists and cutover has happened. Clerk
Production was created for `tunes-seven.vercel.app` by cloning the Invite-only
Development settings. Its Account Portal (`accounts.tunes-seven.vercel.app`)
has no valid TLS certificate, because `tunes-seven.vercel.app` is a shared
Vercel domain the project does not control DNS for — any redirect there (the
default Clerk sign-in/sign-up/user-profile URLs, and `<RedirectToSignIn />`
with no explicit `signInUrl`) failed the TLS handshake outright, which showed
up as the app bouncing between the account portal and `/songs`. Convex
production `warmhearted-dog-849` has the current schema and functions.
Vercel Production has the matching live Clerk publishable and secret keys plus
`NEXT_PUBLIC_CONVEX_URL` for that Convex deployment. The production frontend
is deployed at `https://tunes-seven.vercel.app`; its Clerk login renders and
the `/__clerk` proxy is verified in Clerk. Production Google OAuth is
configured. Convex Production uses the proxy-backed Clerk issuer
`https://tunes-seven.vercel.app/__clerk` (not the unresolvable
`clerk.tunes-seven.vercel.app` subdomain); the owner completed a fresh
production sign-in through `/login`, `/signup`, and `/account` — the app's
own pages, which already route through the same proxy — and the matching
Convex User exists.

That owner User was promoted to Site Admin (`users:setRole`), and the
`supabase-20260817T043229Z` snapshot (unchanged since export; Supabase
received no writes afterward) was imported into Convex production with
`--allow-production`. Convex's own post-import verification passed: 499
artists, 151 songs, 134 release groups, 497 YouTube items, 338
song-artist credits, 501 recordings, 504 recording-artist credits, 501
recording-YouTube items, 151 song_user_data rows, and 479 user_recording_data
rows, all bound to the Site Admin. The 2 non-owner private rows remain
preserved only in the snapshot, as designed. This has not yet been visually
verified by signing into the running production app. The live Supabase
project remains the historical source of truth until that verification
happens; this repo's Supabase tooling has already been removed per owner
decision, since it is no longer needed to complete that verification.

## Remaining migration work

- Sign into `https://tunes-seven.vercel.app` and verify normal workflows
  (Song list, favorites, ordered Recordings, Site Admin discoverability
  control) against the imported production data before entering any new
  repertoire data there.
