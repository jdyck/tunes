-- Rename Tune -> Song at the DB level (ADR-0003, docs/direction/song-user-song-split.md).
-- Renames only: the table, referencing columns, and their constraints/indexes.
-- The Song / User Song *split* (separate shared + private tables) is a future migration.

ALTER TABLE "public"."tunes" RENAME TO "songs";
ALTER TABLE "public"."songs" RENAME CONSTRAINT "tunes_pkey" TO "songs_pkey";
ALTER TABLE "public"."songs" RENAME CONSTRAINT "tunes_id_key" TO "songs_id_key";

ALTER TABLE "public"."recordings" RENAME COLUMN "tune_id" TO "song_id";

ALTER TABLE "public"."song_writers" RENAME COLUMN "tune_id" TO "song_id";
ALTER INDEX "public"."song_writers_tune_id_idx" RENAME TO "song_writers_song_id_idx";
ALTER TABLE "public"."song_writers" RENAME CONSTRAINT "song_writers_tune_id_fkey" TO "song_writers_song_id_fkey";
