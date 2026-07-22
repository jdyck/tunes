# Song administration

The Song private-data split introduces a Site-Admin-only **Visible to all users** switch backed by `songs.is_discoverable`. Its reviewed scope deliberately does not include a cross-User administration view for finding Songs that other Users created with discoverability disabled.

Before meaningful outside Users begin creating Songs, add a minimal admin-only Songs view that:

- lists and searches non-discoverable Songs across Users without exposing any `song_user_data` payload;
- shows enough shared facts and creator/time context for the admin to identify the Song;
- links to Song detail, where the existing **Visible to all users** switch can be reviewed and changed; and
- remains server-authorized through Site Admin status rather than relying only on hidden client UI.

This is a discovery/review surface, not a general moderation system. Duplicate detection/merging, verification badges, edit history, and broader curation workflow remain separate future work.
