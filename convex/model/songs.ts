import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { v, type Infer } from "convex/values";

export const artistKindValidator = v.union(
  v.literal("person"),
  v.literal("group"),
  v.literal("orchestra"),
  v.literal("choir"),
  v.literal("character"),
  v.literal("other"),
  v.null(),
);

export const writerValidator = v.object({
  artistId: v.union(v.id("artists"), v.null()),
  canonicalName: v.union(v.string(), v.null()),
  creditedAs: v.string(),
  role: v.union(
    v.literal("composer"),
    v.literal("lyricist"),
    v.literal("writer"),
  ),
  artistKind: artistKindValidator,
  musicbrainzArtistId: v.union(v.string(), v.null()),
});

export type WriterInput = Infer<typeof writerValidator>;

export const artistViewValidator = v.object({
  id: v.id("artists"),
  name: v.string(),
  kind: artistKindValidator,
  musicbrainz_artist_id: v.union(v.string(), v.null()),
});

export const songArtistCreditViewValidator = v.object({
  id: v.id("songArtistCredits"),
  song_id: v.id("songs"),
  artist_id: v.id("artists"),
  role: v.union(
    v.literal("composer"),
    v.literal("lyricist"),
    v.literal("writer"),
  ),
  credited_as: v.string(),
  sort_order: v.number(),
  artists: artistViewValidator,
});

export const sharedSongViewValidator = v.object({
  id: v.id("songs"),
  name: v.string(),
  year: v.union(v.string(), v.null()),
  wikipedia_extract: v.union(v.string(), v.null()),
  wikipedia_url: v.union(v.string(), v.null()),
  musicbrainz_work_id: v.union(v.string(), v.null()),
  work_date_start: v.union(v.string(), v.null()),
  work_date_end: v.union(v.string(), v.null()),
  is_discoverable: v.boolean(),
  first_discoverable_at: v.union(v.string(), v.null()),
  song_artist_credits: v.array(songArtistCreditViewValidator),
});

export const ownedSongViewValidator = sharedSongViewValidator.extend({
  user_data: v.object({
    user_id: v.id("users"),
    song_id: v.id("songs"),
    notes: v.union(v.string(), v.null()),
    display_title: v.union(v.string(), v.null()),
    favorite: v.boolean(),
    tags: v.union(v.array(v.string()), v.null()),
    created_at: v.string(),
  }),
});

type ReadContext = Pick<QueryCtx | MutationCtx, "db">;

const loadCredits = async (ctx: ReadContext, songId: Id<"songs">) => {
  const credits = await ctx.db
    .query("songArtistCredits")
    .withIndex("by_songId_and_sortOrder", (query) =>
      query.eq("songId", songId),
    )
    .take(25);

  return Promise.all(
    credits.map(async (credit) => {
      const artist = await ctx.db.get(credit.artistId);
      if (!artist) throw new Error("Song credit references a missing Artist");
      return {
        id: credit._id,
        song_id: songId,
        artist_id: artist._id,
        role: credit.role,
        credited_as: credit.creditedAs,
        sort_order: credit.sortOrder,
        artists: {
          id: artist._id,
          name: artist.name,
          kind: artist.kind,
          musicbrainz_artist_id: artist.musicbrainzArtistId,
        },
      };
    }),
  );
};

export const toSharedSongView = async (
  ctx: ReadContext,
  song: Doc<"songs">,
) => ({
  id: song._id,
  name: song.name,
  year: song.year === null ? null : String(song.year),
  wikipedia_extract: song.wikipediaExtract,
  wikipedia_url: song.wikipediaUrl,
  musicbrainz_work_id: song.musicbrainzWorkId,
  work_date_start: song.workDateStart,
  work_date_end: song.workDateEnd,
  is_discoverable: song.isDiscoverable,
  first_discoverable_at: song.firstDiscoverableAt,
  song_artist_credits: await loadCredits(ctx, song._id),
});

export const toOwnedSongView = async (
  ctx: ReadContext,
  song: Doc<"songs">,
  userData: Doc<"songUserData">,
) => ({
  ...(await toSharedSongView(ctx, song)),
  user_data: {
    user_id: userData.userId,
    song_id: userData.songId,
    notes: userData.notes,
    display_title: userData.displayTitle,
    favorite: userData.favorite,
    tags: userData.tags,
    created_at: userData.createdAt,
  },
});

const resolveArtist = async (ctx: MutationCtx, writer: WriterInput) => {
  if (writer.artistId) {
    const artist = await ctx.db.get(writer.artistId);
    if (!artist) throw new Error("Writer references a missing Artist");
    return artist._id;
  }

  if (writer.musicbrainzArtistId) {
    const existing = await ctx.db
      .query("artists")
      .withIndex("by_musicbrainzArtistId", (query) =>
        query.eq("musicbrainzArtistId", writer.musicbrainzArtistId),
      )
      .unique();
    if (existing) return existing._id;
  }

  const name = writer.canonicalName?.trim() || writer.creditedAs.trim();
  if (!name) throw new Error("A writer name is required");

  return ctx.db.insert("artists", {
    name,
    kind: writer.artistKind,
    musicbrainzArtistId: writer.musicbrainzArtistId,
    legacySupabaseId: null,
  });
};

export const replaceWriters = async (
  ctx: MutationCtx,
  songId: Id<"songs">,
  writers: WriterInput[],
) => {
  const existing = await ctx.db
    .query("songArtistCredits")
    .withIndex("by_songId", (query) => query.eq("songId", songId))
    .take(25);
  await Promise.all(existing.map((credit) => ctx.db.delete(credit._id)));

  const normalized = writers.filter((writer) => writer.creditedAs.trim());
  if (normalized.length > 25) {
    throw new Error("A Song cannot have more than 25 writer credits");
  }
  for (const [sortOrder, writer] of normalized.entries()) {
    const artistId = await resolveArtist(ctx, writer);
    await ctx.db.insert("songArtistCredits", {
      songId,
      artistId,
      role: writer.role,
      creditedAs: writer.creditedAs.trim(),
      sortOrder,
      legacySupabaseId: null,
    });
  }
};

export const loadMembership = async (
  ctx: ReadContext,
  userId: Id<"users">,
  songId: Id<"songs">,
) =>
  ctx.db
    .query("songUserData")
    .withIndex("by_userId_and_songId", (query) =>
      query.eq("userId", userId).eq("songId", songId),
    )
    .unique();
