# Private Song Files use owner-authorized HTTP actions

**Status:** Accepted 2026-09-12

## Context

A Song File is a User's private attachment to a Song. The first release supports
PDF, JPEG, PNG, and WebP for lead sheets and scores; it does not support audio.
Files are private by default, and Site Admin status does not bypass that rule
([ADR-0002](0002-song-files-admin-gated-publishing.md)). Convex storage IDs are
safe application references, but `storage.getUrl()` returns a reusable bearer
URL that bypasses later ownership checks
([ADR-0011](0011-clerk-authentication-and-convex-application-backend.md)).

## Decision

Store file bytes in Convex File Storage and metadata in the private `songFiles`
table: owner, Song, `storageId`, sanitized filename, validated content type,
size, and creation time. Index the table by owner/Song/creation time and by
storage ID. No public query exposes a `storageId`, storage URL, or another
User's metadata.

Use authenticated Convex HTTP actions for upload, delivery, and deletion.
Address them with opaque `songFileId` values, never `storageId`. Each action
rechecks the authenticated User's ownership and current Song membership. Upload
validates the allowed types' magic bytes and enforces a 15 MiB limit before
creating owner-bound metadata; if metadata creation fails, it deletes the Blob.

Delivery returns the validated content type, a safe inline filename,
`X-Content-Type-Options: nosniff`, and private no-store caching. The client
creates a short-lived in-memory object URL only after authorization succeeds.

Limit CORS to the exact `APP_ORIGIN` Convex environment value. Do not allow a
wildcard origin or browser access before the Next.js origin is configured.

## Consequences

- HTTP action limits cap this release at 15 MiB, below Convex's 20 MB ceiling.
  Larger private files need a separate design, such as expiring URLs backed by
  Cloudflare R2, without weakening per-request authorization.
- Audio or backing tracks require separate content-type and byte validation,
  size, preview/playback, and rights-policy decisions.
- Removing a User's Song membership must also remove that User's Song File rows
  and storage objects, or adopt a separately approved owner-only policy.
- The owner-only production-to-development data pull excludes Song File metadata
  and bytes and refuses to replace a destination containing Song File rows.
- Public copies need a distinct, audited, Site-Admin-vetted state; they must not
  broaden `songFiles.listMine` or private delivery.

## Rejected alternatives

- Returning `storage.getUrl()` from a query: this leaks a reusable bearer URL
  and cannot revoke access without deleting the file.
- User-controlled rights or publishing controls: rejected by ADR-0002.
- An unrestricted generated upload URL: it would separate upload byte
  validation from authorization and requires pending-intent cleanup. It remains
  a possible future fallback only if the authenticated small-file path proves
  unsuitable.
