# Song / User Song split

The domain model ([domain-model.md](../domain-model.md), [ADR-0003](../adr/0003-song-canonical-user-song-personal.md)) says Song (canonical, shared) and User Song (private notes) are separate concepts. The code and DB don't reflect that yet:

The *rename* side is done (July 2026): routes are `/song/[id]`, the type is `Song`, and migration `20260718000000_rename_tunes_to_songs.sql` renamed `public.tunes` → `public.songs` and `tune_id` → `song_id` columns. No "tune" remains in src.

What remains is the actual *split*: `public.songs` still mixes canonical fields (name, year, writers, wikipedia/musicbrainz metadata) with per-user fields (`notes`, `user_id`) in one row. To do: separate a shared `songs` table from a private `user_songs` table (notes and other personal data), with RLS to match. This is a real schema migration with data movement — scope it before executing, don't do it as a drive-by.
