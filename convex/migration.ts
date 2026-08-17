import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const nullableString = v.union(v.string(), v.null());
const batchResultValidator = v.object({
  inserted: v.number(),
  updated: v.number(),
});

type ReadCtx = MutationCtx | QueryCtx;

const requireLegacyOwner = async (ctx: ReadCtx, legacyUserId: string) => {
  const owner = await ctx.db
    .query("users")
    .withIndex("by_legacySupabaseId", (query) =>
      query.eq("legacySupabaseId", legacyUserId),
    )
    .unique();
  if (!owner) throw new Error(`Legacy owner is not bound: ${legacyUserId}`);
  if (owner.role !== "admin") {
    throw new Error("Legacy owner must be bound to the Site Admin User");
  }
  return owner;
};

const requireSong = async (ctx: ReadCtx, legacyId: string) => {
  const song = await ctx.db
    .query("songs")
    .withIndex("by_legacySupabaseId", (query) =>
      query.eq("legacySupabaseId", legacyId),
    )
    .unique();
  if (!song) throw new Error(`Missing imported Song: ${legacyId}`);
  return song;
};

const requireArtist = async (ctx: ReadCtx, legacyId: string) => {
  const artist = await ctx.db
    .query("artists")
    .withIndex("by_legacySupabaseId", (query) =>
      query.eq("legacySupabaseId", legacyId),
    )
    .unique();
  if (!artist) throw new Error(`Missing imported Artist: ${legacyId}`);
  return artist;
};

const requireRecording = async (ctx: ReadCtx, legacyId: string) => {
  const recording = await ctx.db
    .query("recordings")
    .withIndex("by_legacySupabaseId", (query) =>
      query.eq("legacySupabaseId", legacyId),
    )
    .unique();
  if (!recording) throw new Error(`Missing imported Recording: ${legacyId}`);
  return recording;
};

const requireReleaseGroup = async (ctx: ReadCtx, legacyId: string) => {
  const releaseGroup = await ctx.db
    .query("releaseGroups")
    .withIndex("by_legacySupabaseId", (query) =>
      query.eq("legacySupabaseId", legacyId),
    )
    .unique();
  if (!releaseGroup) {
    throw new Error(`Missing imported Release Group: ${legacyId}`);
  }
  return releaseGroup;
};

export const bindOwner = internalMutation({
  args: { legacyUserId: v.string() },
  returns: v.object({ userId: v.id("users"), updated: v.boolean() }),
  handler: async (ctx, { legacyUserId }) => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (query) => query.eq("role", "admin"))
      .take(2);
    if (admins.length !== 1) {
      throw new Error(
        `Expected exactly one Convex Site Admin User, found ${admins.length}`,
      );
    }
    const admin = admins[0];
    const existingBinding = await ctx.db
      .query("users")
      .withIndex("by_legacySupabaseId", (query) =>
        query.eq("legacySupabaseId", legacyUserId),
      )
      .unique();
    if (existingBinding && existingBinding._id !== admin._id) {
      throw new Error("Legacy owner UUID is already bound to another User");
    }
    if (
      admin.legacySupabaseId !== null &&
      admin.legacySupabaseId !== legacyUserId
    ) {
      throw new Error("Site Admin User is already bound to another legacy UUID");
    }
    if (admin.legacySupabaseId === legacyUserId) {
      return { userId: admin._id, updated: false };
    }
    await ctx.db.patch(admin._id, { legacySupabaseId: legacyUserId });
    return { userId: admin._id, updated: true };
  },
});

const artistValidator = v.object({
  id: v.string(),
  name: v.string(),
  kind: v.union(
    v.literal("person"),
    v.literal("group"),
    v.literal("orchestra"),
    v.literal("choir"),
    v.literal("character"),
    v.literal("other"),
    v.null(),
  ),
  musicbrainz_artist_id: nullableString,
  wikidata_id: nullableString,
  image_url: nullableString,
  image_source_url: nullableString,
  image_license: nullableString,
  image_lookup_completed_at: nullableString,
});

export const importArtists = internalMutation({
  args: { rows: v.array(artistValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const data = {
        name: row.name,
        kind: row.kind,
        musicbrainzArtistId: row.musicbrainz_artist_id,
        wikidataId: row.wikidata_id,
        imageUrl: row.image_url,
        imageSourceUrl: row.image_source_url,
        imageLicense: row.image_license,
        imageLookupCompletedAt: row.image_lookup_completed_at,
        legacySupabaseId: row.id,
      };
      const existing = await ctx.db
        .query("artists")
        .withIndex("by_legacySupabaseId", (query) =>
          query.eq("legacySupabaseId", row.id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("artists", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const songValidator = v.object({
  id: v.string(),
  name: v.string(),
  year: v.union(v.number(), v.null()),
  wikipedia_extract: nullableString,
  wikipedia_url: nullableString,
  musicbrainz_work_id: nullableString,
  work_date_start: nullableString,
  work_date_end: nullableString,
  is_discoverable: v.boolean(),
  first_discoverable_at: nullableString,
});

export const importSongs = internalMutation({
  args: { rows: v.array(songValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const data = {
        name: row.name,
        year: row.year,
        wikipediaExtract: row.wikipedia_extract,
        wikipediaUrl: row.wikipedia_url,
        musicbrainzWorkId: row.musicbrainz_work_id,
        workDateStart: row.work_date_start,
        workDateEnd: row.work_date_end,
        isDiscoverable: row.is_discoverable,
        firstDiscoverableAt: row.first_discoverable_at,
        legacySupabaseId: row.id,
      };
      const existing = await ctx.db
        .query("songs")
        .withIndex("by_legacySupabaseId", (query) =>
          query.eq("legacySupabaseId", row.id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("songs", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const releaseGroupValidator = v.object({
  id: v.string(),
  title: v.string(),
  musicbrainz_release_group_id: nullableString,
});

export const importReleaseGroups = internalMutation({
  args: { rows: v.array(releaseGroupValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const data = {
        title: row.title,
        musicbrainzReleaseGroupId: row.musicbrainz_release_group_id,
        legacySupabaseId: row.id,
      };
      const existing = await ctx.db
        .query("releaseGroups")
        .withIndex("by_legacySupabaseId", (query) =>
          query.eq("legacySupabaseId", row.id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("releaseGroups", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const youtubeItemValidator = v.object({
  video_id: v.string(),
  title: v.string(),
  channel_name: nullableString,
  search_category: v.union(v.literal("song"), v.literal("video")),
  discovery_sources: v.array(
    v.union(
      v.literal("ytmusic_search"),
      v.literal("youtube_search"),
      v.literal("manual_url"),
      v.literal("legacy_recording_url"),
    ),
  ),
  ytmusic_artist_id: nullableString,
  ytmusic_artist_name: nullableString,
  ytmusic_album_id: nullableString,
  ytmusic_album_name: nullableString,
  duration_seconds: v.union(v.number(), v.null()),
  metadata_fetched_at: nullableString,
});

export const importYoutubeItems = internalMutation({
  args: { rows: v.array(youtubeItemValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const data = {
        videoId: row.video_id,
        title: row.title,
        channelName: row.channel_name,
        searchCategory: row.search_category,
        discoverySources: row.discovery_sources,
        ytmusicArtistId: row.ytmusic_artist_id,
        ytmusicArtistName: row.ytmusic_artist_name,
        ytmusicAlbumId: row.ytmusic_album_id,
        ytmusicAlbumName: row.ytmusic_album_name,
        durationSeconds: row.duration_seconds,
        metadataFetchedAt: row.metadata_fetched_at,
        legacySupabaseVideoId: row.video_id,
      };
      const existing = await ctx.db
        .query("youtubeItems")
        .withIndex("by_videoId", (query) => query.eq("videoId", row.video_id))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("youtubeItems", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const songCreditValidator = v.object({
  id: v.string(),
  song_id: v.string(),
  artist_id: v.string(),
  role: v.union(
    v.literal("composer"),
    v.literal("lyricist"),
    v.literal("writer"),
  ),
  credited_as: v.string(),
  sort_order: v.number(),
});

export const importSongArtistCredits = internalMutation({
  args: { rows: v.array(songCreditValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const song = await requireSong(ctx, row.song_id);
      const artist = await requireArtist(ctx, row.artist_id);
      const data = {
        songId: song._id,
        artistId: artist._id,
        role: row.role,
        creditedAs: row.credited_as,
        sortOrder: row.sort_order,
        legacySupabaseId: row.id,
      };
      const existing = await ctx.db
        .query("songArtistCredits")
        .withIndex("by_legacySupabaseId", (query) =>
          query.eq("legacySupabaseId", row.id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("songArtistCredits", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const recordingValidator = v.object({
  id: v.string(),
  song_id: v.string(),
  name: v.string(),
  kind: v.union(v.literal("released"), v.literal("video_capture"), v.null()),
  artist: nullableString,
  year: nullableString,
  album: nullableString,
  duration: nullableString,
  musicbrainz_recording_id: nullableString,
  musicbrainz_release_id: nullableString,
  recording_date_start: nullableString,
  recording_date_end: nullableString,
  recording_location: nullableString,
  release_group_id: nullableString,
});

export const importRecordings = internalMutation({
  args: { rows: v.array(recordingValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const song = await requireSong(ctx, row.song_id);
      const releaseGroup = row.release_group_id
        ? await requireReleaseGroup(ctx, row.release_group_id)
        : null;
      const data = {
        songId: song._id,
        name: row.name,
        kind: row.kind ?? ("video_capture" as const),
        artist: row.artist,
        year: row.year,
        album: row.album,
        duration: row.duration,
        musicbrainzRecordingId: row.musicbrainz_recording_id,
        musicbrainzReleaseId: row.musicbrainz_release_id,
        recordingDateStart: row.recording_date_start,
        recordingDateEnd: row.recording_date_end,
        recordingLocation: row.recording_location,
        releaseGroupId: releaseGroup?._id ?? null,
        legacySupabaseId: row.id,
      };
      const existing = await ctx.db
        .query("recordings")
        .withIndex("by_legacySupabaseId", (query) =>
          query.eq("legacySupabaseId", row.id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("recordings", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const recordingCreditValidator = v.object({
  id: v.string(),
  recording_id: v.string(),
  artist_id: v.string(),
  role: v.literal("performer"),
  credited_as: v.string(),
  sort_order: v.number(),
});

export const importRecordingArtistCredits = internalMutation({
  args: { rows: v.array(recordingCreditValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const recording = await requireRecording(ctx, row.recording_id);
      const artist = await requireArtist(ctx, row.artist_id);
      const data = {
        recordingId: recording._id,
        artistId: artist._id,
        role: row.role,
        creditedAs: row.credited_as,
        sortOrder: row.sort_order,
        legacySupabaseId: row.id,
      };
      const existing = await ctx.db
        .query("recordingArtistCredits")
        .withIndex("by_legacySupabaseId", (query) =>
          query.eq("legacySupabaseId", row.id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("recordingArtistCredits", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const recordingYoutubeItemValidator = v.object({
  recording_id: v.string(),
  youtube_video_id: v.string(),
  created_at: v.string(),
});

export const importRecordingYoutubeItems = internalMutation({
  args: { rows: v.array(recordingYoutubeItemValidator) },
  returns: batchResultValidator,
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const recording = await requireRecording(ctx, row.recording_id);
      const youtubeItem = await ctx.db
        .query("youtubeItems")
        .withIndex("by_videoId", (query) =>
          query.eq("videoId", row.youtube_video_id),
        )
        .unique();
      if (!youtubeItem) {
        throw new Error(`Missing imported YouTube Item: ${row.youtube_video_id}`);
      }
      const data = {
        recordingId: recording._id,
        songId: recording.songId,
        youtubeItemId: youtubeItem._id,
        createdAt: row.created_at,
        legacyRecordingId: row.recording_id,
        legacyYoutubeVideoId: row.youtube_video_id,
      };
      const existing = await ctx.db
        .query("recordingYoutubeItems")
        .withIndex("by_recordingId_and_youtubeItemId", (query) =>
          query
            .eq("recordingId", recording._id)
            .eq("youtubeItemId", youtubeItem._id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("recordingYoutubeItems", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const songUserDataValidator = v.object({
  user_id: v.string(),
  song_id: v.string(),
  notes: nullableString,
  display_title: nullableString,
  favorite: v.boolean(),
  tags: v.union(v.array(v.string()), v.null()),
  created_at: v.string(),
});

export const importSongUserData = internalMutation({
  args: {
    legacyOwnerId: v.string(),
    rows: v.array(songUserDataValidator),
  },
  returns: batchResultValidator,
  handler: async (ctx, { legacyOwnerId, rows }) => {
    const owner = await requireLegacyOwner(ctx, legacyOwnerId);
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      if (row.user_id !== legacyOwnerId) {
        throw new Error("Private Song batch contains a non-owner row");
      }
      const song = await requireSong(ctx, row.song_id);
      const data = {
        userId: owner._id,
        songId: song._id,
        notes: row.notes,
        displayTitle: row.display_title,
        favorite: row.favorite,
        tags: row.tags,
        createdAt: row.created_at,
        creationRequestId: null,
        legacyUserId: row.user_id,
        legacySongId: row.song_id,
      };
      const existing = await ctx.db
        .query("songUserData")
        .withIndex("by_userId_and_songId", (query) =>
          query.eq("userId", owner._id).eq("songId", song._id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("songUserData", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const artistUserDataValidator = v.object({
  user_id: v.string(),
  artist_id: v.string(),
  notes: nullableString,
  tags: v.union(v.array(v.string()), v.null()),
});

export const importArtistUserData = internalMutation({
  args: {
    legacyOwnerId: v.string(),
    rows: v.array(artistUserDataValidator),
  },
  returns: batchResultValidator,
  handler: async (ctx, { legacyOwnerId, rows }) => {
    const owner = await requireLegacyOwner(ctx, legacyOwnerId);
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      if (row.user_id !== legacyOwnerId) {
        throw new Error("Private Artist batch contains a non-owner row");
      }
      const artist = await requireArtist(ctx, row.artist_id);
      const data = {
        userId: owner._id,
        artistId: artist._id,
        notes: row.notes,
        tags: row.tags,
        legacyUserId: row.user_id,
        legacyArtistId: row.artist_id,
      };
      const existing = await ctx.db
        .query("artistUserData")
        .withIndex("by_userId_and_artistId", (query) =>
          query.eq("userId", owner._id).eq("artistId", artist._id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("artistUserData", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const userRecordingDataValidator = v.object({
  user_id: v.string(),
  recording_id: v.string(),
  notes: nullableString,
  rating: v.union(v.number(), v.null()),
  sort_order: v.number(),
  tags: v.union(v.array(v.string()), v.null()),
  key: nullableString,
  tempo: nullableString,
  created_at: v.string(),
});

export const importUserRecordingData = internalMutation({
  args: {
    legacyOwnerId: v.string(),
    rows: v.array(userRecordingDataValidator),
  },
  returns: batchResultValidator,
  handler: async (ctx, { legacyOwnerId, rows }) => {
    const owner = await requireLegacyOwner(ctx, legacyOwnerId);
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      if (row.user_id !== legacyOwnerId) {
        throw new Error("Private Recording batch contains a non-owner row");
      }
      const recording = await requireRecording(ctx, row.recording_id);
      const data = {
        userId: owner._id,
        recordingId: recording._id,
        songId: recording.songId,
        notes: row.notes,
        rating: row.rating,
        sortOrder: row.sort_order,
        tags: row.tags,
        key: row.key,
        tempo: row.tempo,
        createdAt: row.created_at,
        legacyUserId: row.user_id,
        legacyRecordingId: row.recording_id,
      };
      const existing = await ctx.db
        .query("userRecordingData")
        .withIndex("by_userId_and_recordingId", (query) =>
          query.eq("userId", owner._id).eq("recordingId", recording._id),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated += 1;
      } else {
        await ctx.db.insert("userRecordingData", data);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

const countValidator = v.object({
  artists: v.number(),
  artistUserData: v.number(),
  recordingArtistCredits: v.number(),
  recordings: v.number(),
  recordingYoutubeItems: v.number(),
  releaseGroups: v.number(),
  songArtistCredits: v.number(),
  songs: v.number(),
  songUserData: v.number(),
  userRecordingData: v.number(),
  youtubeItems: v.number(),
});

export const verifyOwnerSnapshot = internalQuery({
  args: { legacyOwnerId: v.string() },
  returns: countValidator,
  handler: async (ctx, { legacyOwnerId }) => {
    await requireLegacyOwner(ctx, legacyOwnerId);
    const [
      artists,
      artistUserData,
      recordingArtistCredits,
      recordings,
      recordingYoutubeItems,
      releaseGroups,
      songArtistCredits,
      songs,
      songUserData,
      userRecordingData,
      youtubeItems,
    ] = await Promise.all([
      ctx.db
        .query("artists")
        .withIndex("by_legacySupabaseId", (query) =>
          query.gt("legacySupabaseId", null),
        )
        .take(2000),
      ctx.db
        .query("artistUserData")
        .withIndex("by_legacyUserId", (query) =>
          query.eq("legacyUserId", legacyOwnerId),
        )
        .take(2000),
      ctx.db
        .query("recordingArtistCredits")
        .withIndex("by_legacySupabaseId", (query) =>
          query.gt("legacySupabaseId", null),
        )
        .take(2000),
      ctx.db
        .query("recordings")
        .withIndex("by_legacySupabaseId", (query) =>
          query.gt("legacySupabaseId", null),
        )
        .take(2000),
      ctx.db
        .query("recordingYoutubeItems")
        .withIndex(
          "by_legacyRecordingId_and_legacyYoutubeVideoId",
          (query) => query.gt("legacyRecordingId", null),
        )
        .take(2000),
      ctx.db
        .query("releaseGroups")
        .withIndex("by_legacySupabaseId", (query) =>
          query.gt("legacySupabaseId", null),
        )
        .take(2000),
      ctx.db
        .query("songArtistCredits")
        .withIndex("by_legacySupabaseId", (query) =>
          query.gt("legacySupabaseId", null),
        )
        .take(2000),
      ctx.db
        .query("songs")
        .withIndex("by_legacySupabaseId", (query) =>
          query.gt("legacySupabaseId", null),
        )
        .take(2000),
      ctx.db
        .query("songUserData")
        .withIndex("by_legacyUserId", (query) =>
          query.eq("legacyUserId", legacyOwnerId),
        )
        .take(2000),
      ctx.db
        .query("userRecordingData")
        .withIndex("by_legacyUserId", (query) =>
          query.eq("legacyUserId", legacyOwnerId),
        )
        .take(2000),
      ctx.db
        .query("youtubeItems")
        .withIndex("by_legacySupabaseVideoId", (query) =>
          query.gt("legacySupabaseVideoId", null),
        )
        .take(2000),
    ]);
    return {
      artists: artists.length,
      artistUserData: artistUserData.length,
      recordingArtistCredits: recordingArtistCredits.length,
      recordings: recordings.length,
      recordingYoutubeItems: recordingYoutubeItems.length,
      releaseGroups: releaseGroups.length,
      songArtistCredits: songArtistCredits.length,
      songs: songs.length,
      songUserData: songUserData.length,
      userRecordingData: userRecordingData.length,
      youtubeItems: youtubeItems.length,
    };
  },
});
