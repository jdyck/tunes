# Song / User Song split

The domain model ([domain-model.md](../domain-model.md), [ADR-0003](../adr/0003-song-canonical-user-song-personal.md)) says Song (canonical, shared) and User Song (private notes) are separate concepts. The schema doesn't reflect that yet: `public.songs` mixes canonical fields (name, year, writers, wikipedia/musicbrainz metadata) with per-user fields (`notes`, `user_id`) in one row.

To do: separate a shared `songs` table from a private `user_songs` table (notes and other personal data), with RLS to match. This is a real schema migration with data movement — scope it before executing, don't do it as a drive-by.
