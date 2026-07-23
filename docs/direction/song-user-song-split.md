# Song / `song_user_data` deployment boundary

The reviewed implementation is in `notes/plans-to-review/song-user-data-split.md`. The expand migration and membership-aware application are deployed and have passed the two-account production smoke test. The linked database still retains legacy `songs.user_id` and `songs.notes` plus the narrow old-client compatibility trigger until contraction.

The locally verified contract migration is `supabase/migrations/20260722210000_contract_song_user_data.sql`. Apply it to the linked project, then verify the final column/policy/privilege shape and repeat the owner/test-account list, detail, private-data, creation/reuse, discoverability, Recording-save, and bounded-removal checks. Delete this direction file once contraction and final two-User verification are complete; the lasting model and policy live in the domain model and ADR-0003.
