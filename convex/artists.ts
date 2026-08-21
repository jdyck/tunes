import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "./model/auth";
import {
  artistIdentityViewValidator,
  artistSummaryViewValidator,
  toArtistIdentityView,
} from "./model/artists";
import { ownedSongViewValidator, toOwnedSongView } from "./model/songs";
import {
  savedRecordingViewValidator,
  toSavedRecordingView,
} from "./model/recordings";

const nullableString = v.union(v.string(), v.null());
const repertoireLimit = 500;

const takeRepertoire = async <Value>(load: (limit: number) => Promise<Value[]>) => {
  const values = await load(repertoireLimit + 1);
  if (values.length > repertoireLimit) {
    throw new Error("Artist browsing supports up to 500 repertoire items");
  }
  return values;
};

export const listMine = query({
  args: {},
  returns: v.array(artistSummaryViewValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const [songMemberships, recordingMemberships] = await Promise.all([
      takeRepertoire((limit) =>
        ctx.db
          .query("songUserData")
          .withIndex("by_userId", (index) => index.eq("userId", user._id))
          .take(limit),
      ),
      takeRepertoire((limit) =>
        ctx.db
          .query("userRecordingData")
          .withIndex("by_userId", (index) => index.eq("userId", user._id))
          .take(limit),
      ),
    ]);

    const counts = new Map<
      Id<"artists">,
      { songCount: number; recordingCount: number }
    >();
    const addCounts = (
      artistIds: Set<Id<"artists">>,
      field: "songCount" | "recordingCount",
    ) => {
      for (const artistId of artistIds) {
        const entry = counts.get(artistId) ?? {
          songCount: 0,
          recordingCount: 0,
        };
        entry[field] += 1;
        counts.set(artistId, entry);
      }
    };

    for (const membership of songMemberships) {
      const credits = await ctx.db
        .query("songArtistCredits")
        .withIndex("by_songId", (index) =>
          index.eq("songId", membership.songId),
        )
        .take(25);
      addCounts(new Set(credits.map((credit) => credit.artistId)), "songCount");
    }
    for (const membership of recordingMemberships) {
      const [personnel, attribution] = await Promise.all([
        ctx.db
          .query("recordingArtistCredits")
          .withIndex("by_recordingId", (index) =>
            index.eq("recordingId", membership.recordingId),
          )
          .take(100),
        ctx.db
          .query("recordingArtistAttributions")
          .withIndex("by_recordingId", (index) =>
            index.eq("recordingId", membership.recordingId),
          )
          .take(101),
      ]);
      if (attribution.length > 100) {
        throw new Error("Recording Attribution exceeds 100 parts");
      }
      addCounts(
        new Set([...personnel, ...attribution].map((credit) => credit.artistId)),
        "recordingCount",
      );
    }

    return Promise.all(
      [...counts.entries()].map(async ([artistId, count]) => {
        const artist = await ctx.db.get(artistId);
        if (!artist) throw new Error("Credit references a missing Artist");
        return {
          id: artist._id,
          name: artist.name,
          kind: artist.kind,
          ...count,
        };
      }),
    );
  },
});

export const getIdentity = query({
  args: { artistId: v.id("artists") },
  returns: v.union(artistIdentityViewValidator, v.null()),
  handler: async (ctx, { artistId }) => {
    await getCurrentUser(ctx);
    const artist = await ctx.db.get(artistId);
    return artist ? toArtistIdentityView(artist) : null;
  },
});

export const getMine = query({
  args: { artistId: v.id("artists") },
  returns: v.union(
    v.object({
      artist: artistIdentityViewValidator,
      user_data: v.union(
        v.object({
          user_id: v.id("users"),
          artist_id: v.id("artists"),
          notes: nullableString,
          tags: v.union(v.array(v.string()), v.null()),
        }),
        v.null(),
      ),
      songs: v.array(ownedSongViewValidator),
      recordings: v.array(savedRecordingViewValidator),
      recording_song_titles: v.array(
        v.object({ song_id: v.id("songs"), title: v.string() }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { artistId }) => {
    const user = await getCurrentUser(ctx);
    const artist = await ctx.db.get(artistId);
    if (!artist) return null;

    const [privateData, songCredits, recordingCredits, attributionParts] = await Promise.all([
      ctx.db
        .query("artistUserData")
        .withIndex("by_userId_and_artistId", (index) =>
          index.eq("userId", user._id).eq("artistId", artistId),
        )
        .unique(),
      ctx.db
        .query("songArtistCredits")
        .withIndex("by_artistId", (index) => index.eq("artistId", artistId))
        .take(repertoireLimit + 1),
      ctx.db
        .query("recordingArtistCredits")
        .withIndex("by_artistId", (index) => index.eq("artistId", artistId))
        .take(repertoireLimit + 1),
      ctx.db
        .query("recordingArtistAttributions")
        .withIndex("by_artistId", (index) => index.eq("artistId", artistId))
        .take(repertoireLimit + 1),
    ]);
    if (
      songCredits.length > repertoireLimit ||
      recordingCredits.length > repertoireLimit ||
      attributionParts.length > repertoireLimit
    ) {
      throw new Error("Artist detail supports up to 500 credited items");
    }

    const songs = [];
    for (const songId of new Set(songCredits.map((credit) => credit.songId))) {
      const membership = await ctx.db
        .query("songUserData")
        .withIndex("by_userId_and_songId", (index) =>
          index.eq("userId", user._id).eq("songId", songId),
        )
        .unique();
      if (!membership) continue;
      const song = await ctx.db.get(songId);
      if (!song) throw new Error("Artist credit references a missing Song");
      songs.push(await toOwnedSongView(ctx, song, membership));
    }

    const recordings = [];
    for (const recordingId of new Set(
      [...recordingCredits, ...attributionParts].map(
        (credit) => credit.recordingId,
      ),
    )) {
      const membership = await ctx.db
        .query("userRecordingData")
        .withIndex("by_userId_and_recordingId", (index) =>
          index.eq("userId", user._id).eq("recordingId", recordingId),
        )
        .unique();
      if (!membership) continue;
      const recording = await ctx.db.get(recordingId);
      if (!recording) {
        throw new Error("Artist credit references a missing Recording");
      }
      recordings.push(await toSavedRecordingView(ctx, recording, membership));
    }
    recordings.sort(
      (left, right) => left.user_data.sort_order - right.user_data.sort_order,
    );
    const recordingSongTitles = [];
    for (const songId of new Set(
      recordings.map((recording) => recording.song_id),
    )) {
      const [song, membership] = await Promise.all([
        ctx.db.get(songId),
        ctx.db
          .query("songUserData")
          .withIndex("by_userId_and_songId", (index) =>
            index.eq("userId", user._id).eq("songId", songId),
          )
          .unique(),
      ]);
      if (!song || !membership) {
        throw new Error("Saved Recording references an unavailable Song");
      }
      recordingSongTitles.push({
        song_id: songId,
        title: membership.displayTitle || song.name,
      });
    }

    return {
      artist: toArtistIdentityView(artist),
      user_data: privateData
        ? {
            user_id: privateData.userId,
            artist_id: privateData.artistId,
            notes: privateData.notes,
            tags: privateData.tags,
          }
        : null,
      songs,
      recordings,
      recording_song_titles: recordingSongTitles,
    };
  },
});

export const cacheImage = mutation({
  args: {
    artistId: v.id("artists"),
    wikidataId: nullableString,
    imageUrl: nullableString,
    sourceUrl: nullableString,
    license: nullableString,
  },
  returns: artistIdentityViewValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const artist = await ctx.db.get(args.artistId);
    if (!artist) throw new Error("Artist not found");
    if (artist.imageLookupCompletedAt) return toArtistIdentityView(artist);

    const wikidataId = args.wikidataId?.trim() || null;
    const imageUrl = args.imageUrl?.trim() || null;
    const sourceUrl = args.sourceUrl?.trim() || null;
    const license = args.license?.trim() || null;
    if (wikidataId && !/^Q\d+$/.test(wikidataId)) {
      throw new Error("Invalid Wikidata Artist ID");
    }
    if (imageUrl && !imageUrl.startsWith("https://upload.wikimedia.org/")) {
      throw new Error("Invalid Wikimedia image URL");
    }
    if (
      sourceUrl &&
      !sourceUrl.startsWith("https://commons.wikimedia.org/")
    ) {
      throw new Error("Invalid Wikimedia source URL");
    }
    if (imageUrl && !sourceUrl) {
      throw new Error("A cached Artist image requires its source URL");
    }

    const imageLookupCompletedAt = new Date().toISOString();
    await ctx.db.patch(artist._id, {
      wikidataId,
      imageUrl,
      imageSourceUrl: sourceUrl,
      imageLicense: license,
      imageLookupCompletedAt,
    });
    return toArtistIdentityView({
      ...artist,
      wikidataId,
      imageUrl,
      imageSourceUrl: sourceUrl,
      imageLicense: license,
      imageLookupCompletedAt,
    });
  },
});
