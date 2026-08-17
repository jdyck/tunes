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
    legacySupabaseId: nullableString,
  })
    .index("by_musicbrainzArtistId", ["musicbrainzArtistId"])
    .index("by_legacySupabaseId", ["legacySupabaseId"]),

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
});
