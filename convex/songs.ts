import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "./model/auth";
import {
  loadMembership,
  ownedSongViewValidator,
  replaceWriters,
  sharedSongViewValidator,
  toOwnedSongView,
  toSharedSongView,
  writerValidator,
} from "./model/songs";

const nullableString = v.union(v.string(), v.null());

const sharedSongValidator = v.object({
  name: v.string(),
  year: v.union(v.number(), v.null()),
  wikipediaExtract: nullableString,
  wikipediaUrl: nullableString,
  musicbrainzWorkId: nullableString,
  workDateStart: nullableString,
  workDateEnd: nullableString,
});

const privateSongValidator = v.object({
  notes: nullableString,
  displayTitle: nullableString,
  favorite: v.boolean(),
  tags: v.union(v.array(v.string()), v.null()),
});

const normalizeTags = (tags: string[] | null) => {
  if (!tags) return null;
  const byKey = new Map<string, string>();
  for (const value of tags) {
    const tag = value.trim();
    if (tag) byKey.set(tag.toLocaleLowerCase(), tag);
  }
  return byKey.size ? Array.from(byKey.values()) : null;
};

export const listMine = query({
  args: {},
  returns: v.array(ownedSongViewValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const memberships = await ctx.db
      .query("songUserData")
      .withIndex("by_userId", (query) => query.eq("userId", user._id))
      .take(2000);

    return Promise.all(
      memberships.map(async (membership) => {
        const song = await ctx.db.get(membership.songId);
        if (!song) throw new Error("Song membership references a missing Song");
        return toOwnedSongView(ctx, song, membership);
      }),
    );
  },
});

export const getMine = query({
  args: { songId: v.id("songs") },
  returns: v.object({
    song: ownedSongViewValidator,
    isAdmin: v.boolean(),
  }),
  handler: async (ctx, { songId }) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadMembership(ctx, user._id, songId);
    if (!membership) throw new Error("Song not found in your list");
    const song = await ctx.db.get(songId);
    if (!song) throw new Error("Song not found");
    return {
      song: await toOwnedSongView(ctx, song, membership),
      isAdmin: user.role === "admin",
    };
  },
});

export const searchDiscoverable = query({
  args: { term: v.string() },
  returns: v.array(sharedSongViewValidator),
  handler: async (ctx, { term }) => {
    const user = await getCurrentUser(ctx);
    const normalizedTerm = term.trim();
    if (!normalizedTerm) return [];

    const matches = await ctx.db
      .query("songs")
      .withSearchIndex("search_name", (search) =>
        search
          .search("name", normalizedTerm)
          .eq("isDiscoverable", true),
      )
      .take(10);

    const unsaved = [];
    for (const song of matches) {
      if (!(await loadMembership(ctx, user._id, song._id))) {
        unsaved.push(await toSharedSongView(ctx, song));
      }
    }
    return unsaved;
  },
});

export const create = mutation({
  args: {
    requestId: v.string(),
    shared: sharedSongValidator,
    writers: v.array(writerValidator),
  },
  returns: v.id("songs"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const requestId = args.requestId.trim();
    if (!requestId) throw new Error("A creation request ID is required");

    const previous = await ctx.db
      .query("songUserData")
      .withIndex("by_userId_and_creationRequestId", (query) =>
        query.eq("userId", user._id).eq("creationRequestId", requestId),
      )
      .unique();
    if (previous) return previous.songId;

    const name = args.shared.name.trim();
    if (!name) throw new Error("A Song name is required");

    const songId = await ctx.db.insert("songs", {
      name,
      year: args.shared.year,
      wikipediaExtract: args.shared.wikipediaExtract,
      wikipediaUrl: args.shared.wikipediaUrl,
      musicbrainzWorkId: args.shared.musicbrainzWorkId,
      workDateStart: args.shared.workDateStart,
      workDateEnd: args.shared.workDateEnd,
      isDiscoverable: false,
      firstDiscoverableAt: null,
      legacySupabaseId: null,
    });
    await replaceWriters(ctx, songId, args.writers);
    await ctx.db.insert("songUserData", {
      userId: user._id,
      songId,
      notes: null,
      displayTitle: null,
      favorite: false,
      tags: null,
      createdAt: new Date().toISOString(),
      creationRequestId: requestId,
      legacyUserId: null,
      legacySongId: null,
    });
    return songId;
  },
});

export const addDiscoverable = mutation({
  args: { songId: v.id("songs") },
  returns: v.id("songs"),
  handler: async (ctx, { songId }) => {
    const user = await getCurrentUser(ctx);
    const song = await ctx.db.get(songId);
    if (!song?.isDiscoverable) throw new Error("Discoverable Song not found");

    const existing = await loadMembership(ctx, user._id, songId);
    if (existing) return songId;

    await ctx.db.insert("songUserData", {
      userId: user._id,
      songId,
      notes: null,
      displayTitle: null,
      favorite: false,
      tags: null,
      createdAt: new Date().toISOString(),
      creationRequestId: null,
      legacyUserId: null,
      legacySongId: null,
    });
    return songId;
  },
});

export const update = mutation({
  args: {
    songId: v.id("songs"),
    privateData: privateSongValidator,
    shared: v.union(sharedSongValidator, v.null()),
    writers: v.union(v.array(writerValidator), v.null()),
  },
  returns: v.id("songs"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadMembership(ctx, user._id, args.songId);
    if (!membership) throw new Error("Song not found in your list");
    const song = await ctx.db.get(args.songId);
    if (!song) throw new Error("Song not found");

    await ctx.db.patch(membership._id, {
      notes: args.privateData.notes?.trim() || null,
      displayTitle: args.privateData.displayTitle?.trim() || null,
      favorite: args.privateData.favorite,
      tags: normalizeTags(args.privateData.tags),
    });

    const canEditShared = user.role === "admin" || !song.isDiscoverable;
    if (args.shared || args.writers) {
      if (!canEditShared) throw new Error("Forbidden");
      if (!args.shared || !args.writers) {
        throw new Error("Shared Song data and writers must be updated together");
      }
      const name = args.shared.name.trim();
      if (!name) throw new Error("A shared Song name is required");
      await ctx.db.patch(song._id, {
        name,
        year: args.shared.year,
        wikipediaExtract: args.shared.wikipediaExtract,
        wikipediaUrl: args.shared.wikipediaUrl,
        musicbrainzWorkId: args.shared.musicbrainzWorkId,
        workDateStart: args.shared.workDateStart,
        workDateEnd: args.shared.workDateEnd,
      });
      await replaceWriters(ctx, song._id, args.writers);
    }

    return args.songId;
  },
});

export const setFavorite = mutation({
  args: { songId: v.id("songs"), favorite: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadMembership(ctx, user._id, args.songId);
    if (!membership) throw new Error("Song not found in your list");
    await ctx.db.patch(membership._id, { favorite: args.favorite });
    return null;
  },
});

export const setTags = mutation({
  args: { songId: v.id("songs"), tags: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadMembership(ctx, user._id, args.songId);
    if (!membership) throw new Error("Song not found in your list");
    await ctx.db.patch(membership._id, { tags: normalizeTags(args.tags) });
    return null;
  },
});

export const setDiscoverability = mutation({
  args: { songId: v.id("songs"), isDiscoverable: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const song = await ctx.db.get(args.songId);
    if (!song) throw new Error("Song not found");
    await ctx.db.patch(song._id, {
      isDiscoverable: args.isDiscoverable,
      firstDiscoverableAt:
        args.isDiscoverable && !song.firstDiscoverableAt
          ? new Date().toISOString()
          : song.firstDiscoverableAt,
    });
    return null;
  },
});
