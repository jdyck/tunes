# Canonical entity migrations

[ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md) settles the target entity boundaries. Shared Artist, Release Group, and private User-data boundaries are represented in the schema.

`recordings.releaseGroupId` points to the shared master-level display context;
`musicbrainzReleaseId` remains a subordinate representative edition.
`recordings.album` remains only as an unmatched/manual compatibility field.

## Implementation order and blockers

- Add structured Release Group Attribution as its own follow-up slice, with
  Recording-detail presentation and Artist browsing through the User's saved
  Recordings. Do not implement it by extending the former flattened Recording
  field or by duplicating the existing Recording Attribution relationship.

- Shared canonical rows cannot reuse an “owner may update their own row” rule
  indefinitely. The Song split deliberately introduces `songs.isDiscoverable`
  and the Site-Admin-only **Visible to all users** switch for stable authenticated
  discovery/reuse: members may edit a non-discoverable Song during the
  trusted-development phase, while discoverable Song facts are admin-controlled.
  A Site Admin must retain authority to save the shared fields and Artist credits
  of a discoverable Song; making a Song visible must not make it immutable to
  admins. This does not settle general verification, admin correction,
  conflicting edits, duplicate identification, or merge workflows for Song or
  other canonical entities. Do not generalize it into an isolated canonical/lock
  flag elsewhere. “Canonical entity” means the shared identity boundary, not
  that every newly created row has already been admin-verified.
- Update TypeScript types, Convex schema/functions, and the relevant docs in the
  same change as each migration; do not leave the code half on the old identity
  model.
