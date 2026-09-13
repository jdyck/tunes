import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { loadRecordingArtistRelationships } from "./artistRepertoire";
import { toSavedRecordingView } from "./recordings";
import { toOwnedSongView } from "./songs";

const repertoireLimit = 500;

const takeRepertoire = async <Value>(
  load: (limit: number) => Promise<Value[]>,
) => {
  const values = await load(repertoireLimit + 1);
  if (values.length > repertoireLimit) {
    throw new Error(
      "Artist browsing supports up to 500 repertoire items until its projection is activated",
    );
  }
  return values;
};

export const loadLegacyArtistSummaries = async (
  ctx: QueryCtx,
  userId: Id<"users">,
) => {
  const [songMemberships, recordingMemberships] = await Promise.all([
    takeRepertoire((limit) =>
      ctx.db
        .query("songUserData")
        .withIndex("by_userId", (index) => index.eq("userId", userId))
        .take(limit),
    ),
    takeRepertoire((limit) =>
      ctx.db
        .query("userRecordingData")
        .withIndex("by_userId", (index) => index.eq("userId", userId))
        .take(limit),
    ),
  ]);
  const counts = new Map<
    Id<"artists">,
    { songCount: number; recordingCount: number }
  >();
  const increment = (
    artistIds: Iterable<Id<"artists">>,
    field: "songCount" | "recordingCount",
  ) => {
    for (const artistId of artistIds) {
      const count = counts.get(artistId) ?? {
        songCount: 0,
        recordingCount: 0,
      };
      count[field] += 1;
      counts.set(artistId, count);
    }
  };

  for (const membership of songMemberships) {
    const credits = await ctx.db
      .query("songArtistCredits")
      .withIndex("by_songId", (index) => index.eq("songId", membership.songId))
      .take(25);
    increment(new Set(credits.map((credit) => credit.artistId)), "songCount");
  }
  for (const membership of recordingMemberships) {
    const recording = await ctx.db.get(membership.recordingId);
    if (!recording) {
      throw new Error("Saved Recording references a missing Recording");
    }
    increment(
      (await loadRecordingArtistRelationships(ctx, recording)).keys(),
      "recordingCount",
    );
  }

  return Promise.all(
    [...counts].map(async ([artistId, count]) => {
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
};

export const loadLegacyArtistSongs = async (
  ctx: QueryCtx,
  userId: Id<"users">,
  artistId: Id<"artists">,
) => {
  const credits = await ctx.db
    .query("songArtistCredits")
    .withIndex("by_artistId", (index) => index.eq("artistId", artistId))
    .take(repertoireLimit + 1);
  if (credits.length > repertoireLimit) {
    throw new Error(
      "Artist detail supports up to 500 credited Songs until its projection is activated",
    );
  }
  const songs = [];
  for (const songId of new Set(credits.map((credit) => credit.songId))) {
    const membership = await ctx.db
      .query("songUserData")
      .withIndex("by_userId_and_songId", (index) =>
        index.eq("userId", userId).eq("songId", songId),
      )
      .unique();
    if (!membership) continue;
    const song = await ctx.db.get(songId);
    if (!song) throw new Error("Artist credit references a missing Song");
    songs.push(await toOwnedSongView(ctx, song, membership));
  }
  return songs;
};

export const loadLegacyArtistRecordings = async (
  ctx: QueryCtx,
  userId: Id<"users">,
  artistId: Id<"artists">,
) => {
  const memberships = await takeRepertoire((limit) =>
    ctx.db
      .query("userRecordingData")
      .withIndex("by_userId", (index) => index.eq("userId", userId))
      .take(limit),
  );
  const recordings = [];
  for (const membership of memberships) {
    const recording = await ctx.db.get(membership.recordingId);
    if (!recording) {
      throw new Error("Saved Recording references a missing Recording");
    }
    const reasons = (
      await loadRecordingArtistRelationships(ctx, recording)
    ).get(artistId);
    if (!reasons) continue;
    const [song, songMembership] = await Promise.all([
      ctx.db.get(recording.songId),
      ctx.db
        .query("songUserData")
        .withIndex("by_userId_and_songId", (index) =>
          index.eq("userId", userId).eq("songId", recording.songId),
        )
        .unique(),
    ]);
    if (!song || !songMembership) {
      throw new Error("Saved Recording references an unavailable Song");
    }
    recordings.push({
      ...(await toSavedRecordingView(ctx, recording, membership)),
      relationship_reasons: reasons,
      song_title: songMembership.displayTitle || song.name,
    });
  }
  recordings.sort(
    (left, right) => left.user_data.sort_order - right.user_data.sort_order,
  );
  return recordings;
};
