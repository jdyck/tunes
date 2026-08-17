import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const nullableString = v.union(v.string(), v.null());

export default defineSchema({
  users: defineTable({
    clerkTokenIdentifier: v.string(),
    clerkSubject: v.string(),
    email: nullableString,
    legacySupabaseId: nullableString,
    role: v.union(v.literal("user"), v.literal("admin")),
  })
    .index("by_clerkTokenIdentifier", ["clerkTokenIdentifier"])
    .index("by_clerkSubject", ["clerkSubject"])
    .index("by_legacySupabaseId", ["legacySupabaseId"]),

  songs: defineTable({
    name: v.string(),
    year: v.union(v.number(), v.null()),
    wikipediaExtract: nullableString,
    wikipediaUrl: nullableString,
    musicbrainzWorkId: nullableString,
    workDateStart: nullableString,
    workDateEnd: nullableString,
    isDiscoverable: v.boolean(),
    firstDiscoverableAt: nullableString,
    legacySupabaseId: nullableString,
  })
    .index("by_legacySupabaseId", ["legacySupabaseId"])
    .index("by_musicbrainzWorkId", ["musicbrainzWorkId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["isDiscoverable"],
    }),

  songUserData: defineTable({
    userId: v.id("users"),
    songId: v.id("songs"),
    notes: nullableString,
    displayTitle: nullableString,
    favorite: v.boolean(),
    tags: v.union(v.array(v.string()), v.null()),
    createdAt: v.string(),
    creationRequestId: nullableString,
    legacyUserId: nullableString,
    legacySongId: nullableString,
  })
    .index("by_userId", ["userId"])
    .index("by_songId", ["songId"])
    .index("by_userId_and_songId", ["userId", "songId"])
    .index("by_userId_and_creationRequestId", ["userId", "creationRequestId"]),

  artists: defineTable({
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
    musicbrainzArtistId: nullableString,
    wikidataId: v.optional(nullableString),
    imageUrl: v.optional(nullableString),
    imageSourceUrl: v.optional(nullableString),
    imageLicense: v.optional(nullableString),
    imageLookupCompletedAt: v.optional(nullableString),
    legacySupabaseId: nullableString,
  })
    .index("by_musicbrainzArtistId", ["musicbrainzArtistId"])
    .index("by_legacySupabaseId", ["legacySupabaseId"]),

  artistUserData: defineTable({
    userId: v.id("users"),
    artistId: v.id("artists"),
    notes: nullableString,
    tags: v.union(v.array(v.string()), v.null()),
    legacyUserId: nullableString,
    legacyArtistId: nullableString,
  })
    .index("by_userId", ["userId"])
    .index("by_artistId", ["artistId"])
    .index("by_userId_and_artistId", ["userId", "artistId"]),

  songArtistCredits: defineTable({
    songId: v.id("songs"),
    artistId: v.id("artists"),
    role: v.union(
      v.literal("composer"),
      v.literal("lyricist"),
      v.literal("writer"),
    ),
    creditedAs: v.string(),
    sortOrder: v.number(),
    legacySupabaseId: nullableString,
  })
    .index("by_songId", ["songId"])
    .index("by_songId_and_sortOrder", ["songId", "sortOrder"])
    .index("by_artistId", ["artistId"]),

  releaseGroups: defineTable({
    title: v.string(),
    musicbrainzReleaseGroupId: nullableString,
    legacySupabaseId: nullableString,
  })
    .index("by_musicbrainzReleaseGroupId", ["musicbrainzReleaseGroupId"])
    .index("by_legacySupabaseId", ["legacySupabaseId"]),

  recordings: defineTable({
    songId: v.id("songs"),
    name: v.string(),
    kind: v.union(v.literal("released"), v.literal("video_capture")),
    artist: nullableString,
    year: nullableString,
    album: nullableString,
    duration: nullableString,
    musicbrainzRecordingId: nullableString,
    musicbrainzReleaseId: nullableString,
    recordingDateStart: nullableString,
    recordingDateEnd: nullableString,
    recordingLocation: nullableString,
    releaseGroupId: v.union(v.id("releaseGroups"), v.null()),
    legacySupabaseId: nullableString,
  })
    .index("by_songId", ["songId"])
    .index("by_musicbrainzRecordingId", ["musicbrainzRecordingId"])
    .index("by_releaseGroupId", ["releaseGroupId"])
    .index("by_legacySupabaseId", ["legacySupabaseId"]),

  userRecordingData: defineTable({
    userId: v.id("users"),
    recordingId: v.id("recordings"),
    songId: v.id("songs"),
    notes: nullableString,
    rating: v.union(v.number(), v.null()),
    sortOrder: v.number(),
    tags: v.union(v.array(v.string()), v.null()),
    key: nullableString,
    tempo: nullableString,
    createdAt: v.string(),
    legacyUserId: nullableString,
    legacyRecordingId: nullableString,
  })
    .index("by_userId", ["userId"])
    .index("by_recordingId", ["recordingId"])
    .index("by_userId_and_recordingId", ["userId", "recordingId"])
    .index("by_userId_and_songId_and_sortOrder", [
      "userId",
      "songId",
      "sortOrder",
    ]),

  youtubeItems: defineTable({
    videoId: v.string(),
    title: v.string(),
    channelName: nullableString,
    searchCategory: v.union(v.literal("song"), v.literal("video")),
    discoverySources: v.array(
      v.union(
        v.literal("ytmusic_search"),
        v.literal("youtube_search"),
        v.literal("manual_url"),
        v.literal("legacy_recording_url"),
      ),
    ),
    ytmusicArtistId: nullableString,
    ytmusicArtistName: nullableString,
    ytmusicAlbumId: nullableString,
    ytmusicAlbumName: nullableString,
    durationSeconds: v.union(v.number(), v.null()),
    metadataFetchedAt: nullableString,
  }).index("by_videoId", ["videoId"]),

  recordingYoutubeItems: defineTable({
    recordingId: v.id("recordings"),
    songId: v.id("songs"),
    youtubeItemId: v.id("youtubeItems"),
    createdAt: v.string(),
  })
    .index("by_recordingId_and_createdAt", ["recordingId", "createdAt"])
    .index("by_recordingId_and_youtubeItemId", [
      "recordingId",
      "youtubeItemId",
    ])
    .index("by_songId_and_youtubeItemId", ["songId", "youtubeItemId"])
    .index("by_youtubeItemId", ["youtubeItemId"]),

  recordingArtistCredits: defineTable({
    recordingId: v.id("recordings"),
    artistId: v.id("artists"),
    role: v.literal("performer"),
    creditedAs: v.string(),
    sortOrder: v.number(),
    legacySupabaseId: nullableString,
  })
    .index("by_recordingId", ["recordingId"])
    .index("by_recordingId_and_sortOrder", ["recordingId", "sortOrder"])
    .index("by_artistId", ["artistId"]),
});
