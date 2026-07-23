# Canonical entity migrations

[ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md) settles the target entity boundaries. The shared Artist and private User-data boundaries are represented in the schema; Release Groups remain unimplemented. Treat the remaining work below as a scoped data migration with explicit field mapping and RLS review, not opportunistic table renames.

## Current mismatches

- `recordings.album` and the stored MusicBrainz Release ID flatten a master-level Release Group, a chosen Recording relationship, an editable title snapshot, and a representative edition into one area.

## Migration direction

Add a shared master-level Release Group identity with provider mappings and keep representative edition identity subordinate. Add separate `original_release_group_id` and `primary_release_group_id` Recording relationships: the first preserves earliest-publication provenance, while the second selects the most useful album context. Primary candidates must contain the exact Recording; exclude compilations/remixes by default and let a trusted provider album hint choose only among otherwise eligible candidates. Original and Primary may point to the same Release Group. Keep either null when MusicBrainz evidence remains ambiguous.

## Implementation order and blockers

- Release Group semantics are unblocked. Matching still depends on the MusicBrainz transport work, and ambiguous evidence must remain null/user-confirmed rather than forcing either relationship.
- Shared canonical rows cannot reuse the old “owner may update their own row” policies indefinitely. The Song split deliberately introduces `songs.is_discoverable` and the Site-Admin-only **Visible to all users** switch for the narrow purpose of stable authenticated discovery/reuse: members may edit a non-discoverable Song during the trusted-development phase, while discoverable Song facts are admin-controlled. A Site Admin must retain authority to save the shared fields and Artist credits of a discoverable Song; making a Song visible must not make it immutable to admins. This does not settle general verification, admin correction, conflicting edits, duplicate identification, or merge workflows for Song or other canonical entities. Do not generalize it into an isolated `is_canonical`/lock flag elsewhere. “Canonical entity” means the shared identity boundary, not that every newly created row has already been admin-verified.
- Update TypeScript types, Supabase selects/inserts, and the relevant docs in the same change as each migration; do not leave the code half on the old identity model.
