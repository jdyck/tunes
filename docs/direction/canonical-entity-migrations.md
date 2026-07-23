# Canonical Artist and Release Group migrations

[ADR-0008](../adr/0008-provider-neutral-music-entities-and-user-data.md) settles the target entity boundaries. The Artist migration is in its compatibility rollout; Release Groups remain unimplemented. Treat the remaining changes below as scoped data migrations with explicit field mapping and RLS review, not opportunistic table renames.

## Current mismatches

- Artist-backed Song credits are exposed at the target `song_artist_credits` boundary, but their compatibility storage still uses `song_writers` plus a temporary `people` mirror. The contract migration must remove that legacy path after the Artist-aware application is verified.
- `artists` is now the shared canonical identity and `artist_user_data` is the private layer. Legacy private columns remain on `artists` only for compatibility and must be removed during contraction.
- `recordings.album` and the stored MusicBrainz Release ID flatten a master-level Release Group, a chosen Recording relationship, an editable title snapshot, and a representative edition into one area.

## Migration direction

1. **Canonical Artist and credits.** Finish the compatibility rollout by verifying the Artist-aware application, then contract away `people`, legacy `song_writers` storage, compatibility triggers, and the obsolete private columns on `artists`. Preserve shared Artist IDs, MusicBrainz identity, nullable kind, credited-as text, credit roles/order, and private `artist_user_data`; never infer group members.
2. **Release Groups and editions.** Add a shared master-level Release Group identity with provider mappings and keep representative edition identity subordinate. Add separate `original_release_group_id` and `primary_release_group_id` Recording relationships: the first preserves earliest-publication provenance, while the second selects the most useful album context. Primary candidates must contain the exact Recording; exclude compilations/remixes by default and let a trusted provider album hint choose only among otherwise eligible candidates. Original and Primary may point to the same Release Group. Keep either null when MusicBrainz evidence remains ambiguous.

## Implementation order and blockers

- Canonical Artist contraction is semantically unblocked after application smoke tests and two-User privacy verification. Keep the compatibility surface until those checks pass.
- Release Group semantics are unblocked. Matching still depends on the MusicBrainz transport work, and ambiguous evidence must remain null/user-confirmed rather than forcing either relationship.
- Shared canonical rows cannot reuse the old “owner may update their own row” policies indefinitely. The Song split deliberately introduces `songs.is_discoverable` and the Site-Admin-only **Visible to all users** switch for the narrow purpose of stable authenticated discovery/reuse: members may edit a non-discoverable Song during the trusted-development phase, while discoverable Song facts are admin-controlled. This does not settle general verification, admin correction, conflicting edits, duplicate identification, or merge workflows for Song or other canonical entities. Do not generalize it into an isolated `is_canonical`/lock flag elsewhere. “Canonical entity” means the shared identity boundary, not that every newly created row has already been admin-verified.
- Update TypeScript types, Supabase selects/inserts, and the relevant docs in the same change as each migration; do not leave the code half on the old identity model.
