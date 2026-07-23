# Canonical Artist and Release Group migrations

[ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md) settles the target entity boundaries, but the current schema still reflects earlier assumptions. Treat the changes below as scoped data migrations with explicit field mapping and RLS review, not opportunistic table renames.

## Current mismatches

- `people` is the identity behind `song_writers`, so a MusicBrainz Group/Orchestra/etc. writer cannot be represented faithfully.
- `artists` is currently User-owned and holds private notes, while dormant `recording_artists` points to it. It cannot become the shared canonical Artist table without first moving private data.
- `recordings.album` and the stored MusicBrainz Release ID flatten a master-level Release Group, a chosen Recording relationship, an editable title snapshot, and a representative edition into one area.

## Migration direction

1. **Canonical Artist and credits.** Make shared `artists` broad enough for person, group, orchestra, choir, character, and other, with nullable kind for unknown rather than coercing missing data to `other`. Preserve MusicBrainz Artist identity and credited-as text. Migrate `people` and `song_writers` into Artist-backed Song credits with role and order. Move the existing private Artist notes, plus planned personal tags, into `artist_user_data` before repurposing the table, with at most one row per User/Artist. Point structured Recording credits at the same Artist identity; never infer group members.
2. **Release Groups and editions.** Add a shared master-level Release Group identity with provider mappings and keep representative edition identity subordinate. Add separate `original_release_group_id` and `primary_release_group_id` Recording relationships: the first preserves earliest-publication provenance, while the second selects the most useful album context. Primary candidates must contain the exact Recording; exclude compilations/remixes by default and let a trusted provider album hint choose only among otherwise eligible candidates. Original and Primary may point to the same Release Group. Keep either null when MusicBrainz evidence remains ambiguous.

## Implementation order and blockers

- Canonical Artist work is semantically unblocked but needs a migration plan for existing private `artists.notes` and RLS.
- Release Group semantics are unblocked. Matching still depends on the MusicBrainz transport work, and ambiguous evidence must remain null/user-confirmed rather than forcing either relationship.
- Shared canonical rows cannot reuse the old “owner may update their own row” policies indefinitely. The Song split deliberately introduces `songs.is_discoverable` and the Site-Admin-only **Visible to all users** switch for the narrow purpose of stable authenticated discovery/reuse: members may edit a non-discoverable Song during the trusted-development phase, while discoverable Song facts are admin-controlled. This does not settle general verification, admin correction, conflicting edits, duplicate identification, or merge workflows for Song or other canonical entities. Do not generalize it into an isolated `is_canonical`/lock flag elsewhere. “Canonical entity” means the shared identity boundary, not that every newly created row has already been admin-verified.
- Update TypeScript types, Supabase selects/inserts, and the relevant docs in the same change as each migration; do not leave the code half on the old identity model.
