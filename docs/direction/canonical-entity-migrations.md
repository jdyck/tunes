# Canonical Artist, Recording contraction, and Release Group migrations

[ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md) settles the target entity boundaries, but the current schema still reflects earlier assumptions. Treat the changes below as scoped data migrations with explicit field mapping and RLS review, not opportunistic table renames.

## Current mismatches

- `people` is the identity behind `song_writers`, so a MusicBrainz Group/Orchestra/etc. writer cannot be represented faithfully.
- `artists` is currently User-owned and holds private notes, while dormant `recording_artists` points to it. It cannot become the shared canonical Artist table without first moving private data.
- `user_recording_data`, normalized YouTube Items, and the new application read/write paths are in place, but `recordings.user_id`, `notes`, `rating`, `sortOrder`, `tags`, and `url` plus a database dual-write trigger remain temporarily for compatibility with the still-deployed combined-row client.
- `recordings.album` and the stored MusicBrainz Release ID flatten a master-level Release Group, a chosen Recording relationship, an editable title snapshot, and a representative edition into one area.

## Migration direction

1. **Canonical Artist and credits.** Make shared `artists` broad enough for person, group, orchestra, choir, character, and other, with nullable kind for unknown rather than coercing missing data to `other`. Preserve MusicBrainz Artist identity and credited-as text. Migrate `people` and `song_writers` into Artist-backed Song credits with role and order. Move the existing private Artist notes, plus planned personal tags, into `artist_user_data` before repurposing the table, with at most one row per User/Artist. Point structured Recording credits at the same Artist identity; never infer group members.
2. **Recording compatibility contraction.** After the new application and server-only YouTube credential are deployed, verify all reads and writes use `user_recording_data` and `recording_youtube_items`, remove the legacy dual-write/unsave triggers and helper functions, drop the six compatibility columns from `recordings`, and broaden canonical Recording SELECT to authenticated Users. Keep canonical client deletion unavailable. Do not contract while the old deployed client is still active.
3. **Release Groups and editions.** Add a shared master-level Release Group identity with provider mappings and keep representative edition identity subordinate. Add separate `original_release_group_id` and `primary_release_group_id` Recording relationships: the first preserves earliest-publication provenance, while the second selects the most useful album context. Primary candidates must contain the exact Recording; exclude compilations/remixes by default and let a trusted provider album hint choose only among otherwise eligible candidates. Original and Primary may point to the same Release Group. Keep either null when MusicBrainz evidence remains ambiguous.

## Implementation order and blockers

- Canonical Artist work is semantically unblocked but needs a migration plan for existing private `artists.notes` and RLS.
- Recording contraction is blocked on deployment of the new client and the Vercel `YOUTUBE_API_KEY` transition; the expansion migration deliberately keeps the old client operational.
- Release Group semantics are unblocked. Matching still depends on the MusicBrainz transport work, and ambiguous evidence must remain null/user-confirmed rather than forcing either relationship.
- Shared canonical rows cannot reuse the current “owner may update their own row” policies indefinitely. The current trusted-development phase may use an explicitly temporary saved-User/last-write-wins edit policy so the entity migrations are not blocked on a full curation system. Long term, any authenticated User may create a shared entity, while an admin-confirmed fact or identity should be distinguishable as authoritative and protected from ordinary edits. The exact verification/lock representation, admin correction workflow, conflicting-edit behavior, duplicate identification, and merge process are one future curation/administration design; do not add an isolated `is_canonical`/lock flag during these migrations. “Canonical entity” here means the shared identity boundary, not that every newly created row has already been admin-verified.
- Update TypeScript types, Supabase selects/inserts, and the relevant docs in the same change as each migration; do not leave the code half on the old identity model.
