# Song / User Song split

The domain model ([domain-model.md](../domain-model.md), [ADR-0003](../adr/0003-song-canonical-user-song-personal.md)) says Song (canonical, shared) and User Song (private notes) are separate concepts. The code and DB don't reflect that yet:

- `src/types/types.ts` still defines a single `Tune` interface (name, composer, year, notes, user_id all together).
- The Supabase table is still `public.tunes`, not split into a shared `songs` table + a private `user_songs` table.
- Routes have since been renamed (`/song/[id]` under `(browse)`), so the remaining code-side work is the `Tune` type and the DB tables.

To do: actually split this into a shared Song table/type and a private User Song table/type, and rename the code/routes/DB to match. This is a real migration (schema change + route changes), not a drive-by rename — don't do it unprompted.
