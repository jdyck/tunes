import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
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
const recordingRelationshipReasonValidator = v.union(
  v.literal("release_group_attribution"),
  v.literal("attribution"),
  v.literal("personnel"),
);
const artistRecordingViewValidator = savedRecordingViewValidator.extend({
  relationship_reasons: v.array(recordingRelationshipReasonValidator),
});

const loadRecordingArtistRelationships = async (
  ctx: Pick<QueryCtx, "db">,
  recordingId: Id<"recordings">,
  releaseGroupId: Id<"releaseGroups"> | null,
) => {
  const [personnel, attribution, releaseGroupAttribution] = await Promise.all([
    ctx.db
      .query("recordingArtistCredits")
      .withIndex("by_recordingId", (index) =>
        index.eq("recordingId", recordingId),
      )
      .take(101),
    ctx.db
      .query("recordingArtistAttributions")
      .withIndex("by_recordingId", (index) =>
        index.eq("recordingId", recordingId),
      )
      .take(101),
    releaseGroupId
      ? ctx.db
          .query("releaseGroupArtistAttributions")
          .withIndex("by_releaseGroupId", (index) =>
            index.eq("releaseGroupId", releaseGroupId),
          )
          .take(101)
      : Promise.resolve([]),
  ]);
  if (personnel.length > 100) {
    throw new Error("Recording Personnel exceeds 100 credits");
  }
  if (attribution.length > 100) {
    throw new Error("Recording Attribution exceeds 100 parts");
  }
  if (releaseGroupAttribution.length > 100) {
    throw new Error("Release Group Attribution exceeds 100 parts");
  }
  return { personnel, attribution, releaseGroupAttribution };
};

const takeRepertoire = async <Value>(
  load: (limit: number) => Promise<Value[]>,
) => {
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
      const recording = await ctx.db.get(membership.recordingId);
      if (!recording) {
        throw new Error("Saved Recording references a missing Recording");
      }
      const { personnel, attribution, releaseGroupAttribution } =
        await loadRecordingArtistRelationships(
          ctx,
          membership.recordingId,
          recording.releaseGroupId,
        );
      addCounts(
        new Set(
          [...personnel, ...attribution, ...releaseGroupAttribution].map(
            (credit) => credit.artistId,
          ),
        ),
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

export const search = query({
  args: { query: v.string() },
  returns: v.array(artistIdentityViewValidator),
  handler: async (ctx, { query: searchQuery }) => {
    await getCurrentUser(ctx);
    const term = searchQuery.trim();
    if (!term) return [];
    const artists = await ctx.db
      .query("artists")
      .withSearchIndex("search_name", (index) => index.search("name", term))
      .take(25);
    return artists.map(toArtistIdentityView);
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
      recordings: v.array(artistRecordingViewValidator),
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

    const [privateData, songCredits, recordingMemberships] = await Promise.all([
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
        .query("userRecordingData")
        .withIndex("by_userId", (index) => index.eq("userId", user._id))
        .take(repertoireLimit + 1),
    ]);
    if (
      songCredits.length > repertoireLimit ||
      recordingMemberships.length > repertoireLimit
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

    const recordings = await Promise.all(
      [
        ...new Map(
          recordingMemberships.map((membership) => [
            membership.recordingId,
            membership,
          ]),
        ).values(),
      ].map(async (membership) => {
        const recording = await ctx.db.get(membership.recordingId);
        if (!recording) {
          throw new Error("Saved Recording references a missing Recording");
        }
        const relationships = await loadRecordingArtistRelationships(
          ctx,
          membership.recordingId,
          recording.releaseGroupId,
        );

        const { personnel, attribution, releaseGroupAttribution } =
          relationships;

        const relationshipReasons = [
          ...(releaseGroupAttribution.some((part) => part.artistId === artistId)
            ? ["release_group_attribution" as const]
            : []),
          ...(attribution.some((part) => part.artistId === artistId)
            ? ["attribution" as const]
            : []),
          ...(personnel.some((credit) => credit.artistId === artistId)
            ? ["personnel" as const]
            : []),
        ];
        if (relationshipReasons.length === 0) return null;

        return {
          ...(await toSavedRecordingView(ctx, recording, membership)),
          relationship_reasons: relationshipReasons,
        };
      }),
    );
    const reachableRecordings = recordings.filter(
      (recording): recording is NonNullable<typeof recording> =>
        recording !== null,
    );
    reachableRecordings.sort(
      (left, right) => left.user_data.sort_order - right.user_data.sort_order,
    );
    const recordingSongTitles = [];
    for (const songId of new Set(
      reachableRecordings.map((recording) => recording.song_id),
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
      recordings: reachableRecordings,
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
    if (sourceUrl && !sourceUrl.startsWith("https://commons.wikimedia.org/")) {
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
