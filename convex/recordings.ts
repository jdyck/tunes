import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./model/auth";
import { loadMembership } from "./model/songs";
import {
  formatDuration,
  loadSavedRecordingMembership,
  normalizeTags,
  privateRecordingInputValidator,
  recordingArtworkViewValidator,
  recordingKindValidator,
  replaceAttribution,
  replacePerformers,
  replaceReleaseGroupAttribution,
  savedRecordingViewValidator,
  sharedRecordingInputValidator,
  toSavedRecordingView,
  toRecordingArtworkView,
  youtubeDiscoverySourceValidator,
  youtubeSearchCategoryValidator,
} from "./model/recordings";

export const listArtworkMine = query({
  args: {},
  returns: v.array(recordingArtworkViewValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const memberships = await ctx.db
      .query("userRecordingData")
      .withIndex("by_userId", (index) => index.eq("userId", user._id))
      .take(500);
    const firstBySong = new Map<Id<"songs">, (typeof memberships)[number]>();

    for (const membership of memberships) {
      const previous = firstBySong.get(membership.songId);
      if (
        !previous ||
        membership.sortOrder < previous.sortOrder ||
        (membership.sortOrder === previous.sortOrder &&
          membership._creationTime < previous._creationTime)
      ) {
        firstBySong.set(membership.songId, membership);
      }
    }

    return Promise.all(
      [...firstBySong.values()].map(async (membership) => {
        const recording = await ctx.db.get(membership.recordingId);
        if (!recording) {
          throw new Error("Saved Recording references a missing Recording");
        }
        return toRecordingArtworkView(ctx, recording);
      }),
    );
  },
});

const nullableString = v.union(v.string(), v.null());

const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const musicDatePattern = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

const trimToNull = (value: string | null) => value?.trim() || null;

const musicDateBounds = (value: string) => {
  const match = musicDatePattern.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  if (year === 0 || (month !== null && (month < 1 || month > 12))) {
    return null;
  }
  if (day !== null) {
    if (month === null) return null;
    const valid = new Date(Date.UTC(year, month - 1, day));
    if (
      valid.getUTCFullYear() !== year ||
      valid.getUTCMonth() !== month - 1 ||
      valid.getUTCDate() !== day
    ) {
      return null;
    }
  }

  const startMonth = month ?? 1;
  const startDay = day ?? 1;
  const endMonth = month ?? 12;
  const endDay =
    day ?? new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return {
    lower: year * 10000 + startMonth * 100 + startDay,
    upper: year * 10000 + endMonth * 100 + endDay,
  };
};

const validateMusicDateRange = (
  start: string | null,
  end: string | null,
) => {
  const startBounds = start ? musicDateBounds(start) : null;
  const endBounds = end ? musicDateBounds(end) : null;
  if (start && !startBounds) throw new Error("Invalid Recording start date");
  if (end && !endBounds) throw new Error("Invalid Recording end date");
  if (endBounds && (!startBounds || startBounds.lower > endBounds.upper)) {
    throw new Error("Recording date range is invalid");
  }
};

const resolveReleaseGroup = async (
  ctx: MutationCtx,
  input: {
    title: string;
    musicbrainz_release_group_id: string;
    attribution: Parameters<typeof replaceReleaseGroupAttribution>[2];
  } | null,
) => {
  if (!input) return null;
  const title = input.title.trim();
  const musicbrainzReleaseGroupId =
    input.musicbrainz_release_group_id.trim();
  if (!title || !musicbrainzReleaseGroupId) {
    throw new Error(
      "Release Group requires a title and MusicBrainz provider ID",
    );
  }

  const existing = await ctx.db
    .query("releaseGroups")
    .withIndex("by_musicbrainzReleaseGroupId", (index) =>
      index.eq("musicbrainzReleaseGroupId", musicbrainzReleaseGroupId),
    )
    .unique();
  const releaseGroupId = existing
    ? existing._id
    : await ctx.db.insert("releaseGroups", {
        title,
        musicbrainzReleaseGroupId,
        legacySupabaseId: null,
      });
  await replaceReleaseGroupAttribution(ctx, releaseGroupId, input.attribution);
  return releaseGroupId;
};

export const listMine = query({
  args: { songId: v.id("songs") },
  returns: v.array(savedRecordingViewValidator),
  handler: async (ctx, { songId }) => {
    const user = await getCurrentUser(ctx);
    const songMembership = await loadMembership(ctx, user._id, songId);
    if (!songMembership) throw new Error("Song not found in your list");

    const memberships = await ctx.db
      .query("userRecordingData")
      .withIndex("by_userId_and_songId_and_sortOrder", (index) =>
        index.eq("userId", user._id).eq("songId", songId),
      )
      .take(500);

    return Promise.all(
      memberships.map(async (membership) => {
        const recording = await ctx.db.get(membership.recordingId);
        if (!recording) {
          throw new Error("Saved Recording references a missing Recording");
        }
        return toSavedRecordingView(ctx, recording, membership);
      }),
    );
  },
});

export const getMine = query({
  args: { recordingId: v.id("recordings") },
  returns: v.union(savedRecordingViewValidator, v.null()),
  handler: async (ctx, { recordingId }) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadSavedRecordingMembership(
      ctx,
      user._id,
      recordingId,
    );
    if (!membership) return null;
    const recording = await ctx.db.get(recordingId);
    if (!recording) throw new Error("Recording not found");
    return toSavedRecordingView(ctx, recording, membership);
  },
});

export const saveYoutube = mutation({
  args: {
    songId: v.id("songs"),
    videoId: v.string(),
    title: v.string(),
    channelName: nullableString,
    searchCategory: youtubeSearchCategoryValidator,
    discoverySource: youtubeDiscoverySourceValidator,
    recordingKind: recordingKindValidator,
    ytmusicArtistId: nullableString,
    ytmusicArtistName: nullableString,
    ytmusicAlbumId: nullableString,
    ytmusicAlbumName: nullableString,
    durationSeconds: v.union(v.number(), v.null()),
    metadataFetchedAt: nullableString,
  },
  returns: v.id("recordings"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const songMembership = await loadMembership(ctx, user._id, args.songId);
    if (!songMembership) throw new Error("Song not found in your list");

    const videoId = args.videoId.trim();
    const title = args.title.trim();
    if (!youtubeVideoIdPattern.test(videoId)) {
      throw new Error("Invalid YouTube video ID");
    }
    if (!title) throw new Error("YouTube title is required");
    if (args.durationSeconds !== null && args.durationSeconds < 0) {
      throw new Error("Invalid YouTube duration");
    }

    const previousItem = await ctx.db
      .query("youtubeItems")
      .withIndex("by_videoId", (index) => index.eq("videoId", videoId))
      .unique();
    let youtubeItemId: Id<"youtubeItems">;
    if (previousItem) {
      const placeholder = `YouTube video ${videoId}`;
      const nextTitle =
        title === placeholder && previousItem.title !== placeholder
          ? previousItem.title
          : title;
      const discoverySources = Array.from(
        new Set([...previousItem.discoverySources, args.discoverySource]),
      ).sort();
      const metadataFetchedAt =
        args.metadataFetchedAt &&
        (!previousItem.metadataFetchedAt ||
          args.metadataFetchedAt > previousItem.metadataFetchedAt)
          ? args.metadataFetchedAt
          : previousItem.metadataFetchedAt;
      await ctx.db.patch(previousItem._id, {
        title: nextTitle,
        channelName: trimToNull(args.channelName) ?? previousItem.channelName,
        searchCategory:
          previousItem.searchCategory === "song" ||
          args.searchCategory === "song"
            ? "song"
            : "video",
        discoverySources,
        ytmusicArtistId:
          trimToNull(args.ytmusicArtistId) ?? previousItem.ytmusicArtistId,
        ytmusicArtistName:
          trimToNull(args.ytmusicArtistName) ?? previousItem.ytmusicArtistName,
        ytmusicAlbumId:
          trimToNull(args.ytmusicAlbumId) ?? previousItem.ytmusicAlbumId,
        ytmusicAlbumName:
          trimToNull(args.ytmusicAlbumName) ?? previousItem.ytmusicAlbumName,
        durationSeconds:
          args.durationSeconds ?? previousItem.durationSeconds,
        metadataFetchedAt,
      });
      youtubeItemId = previousItem._id;
    } else {
      youtubeItemId = await ctx.db.insert("youtubeItems", {
        videoId,
        title,
        channelName: trimToNull(args.channelName),
        searchCategory: args.searchCategory,
        discoverySources: [args.discoverySource],
        ytmusicArtistId: trimToNull(args.ytmusicArtistId),
        ytmusicArtistName: trimToNull(args.ytmusicArtistName),
        ytmusicAlbumId: trimToNull(args.ytmusicAlbumId),
        ytmusicAlbumName: trimToNull(args.ytmusicAlbumName),
        durationSeconds: args.durationSeconds,
        metadataFetchedAt: args.metadataFetchedAt,
      });
    }

    const association = await ctx.db
      .query("recordingYoutubeItems")
      .withIndex("by_songId_and_youtubeItemId", (index) =>
        index
          .eq("songId", args.songId)
          .eq("youtubeItemId", youtubeItemId),
      )
      .first();

    let recordingId: Id<"recordings">;
    if (association) {
      const recording = await ctx.db.get(association.recordingId);
      if (!recording || recording.songId !== args.songId) {
        throw new Error("YouTube association references an invalid Recording");
      }
      recordingId = recording._id;
    } else {
      recordingId = await ctx.db.insert("recordings", {
        songId: args.songId,
        name: title,
        kind: args.recordingKind,
        artist:
          trimToNull(args.ytmusicArtistName) ??
          trimToNull(args.channelName)?.replace(/ - Topic$/, "") ??
          null,
        year: null,
        album: null,
        duration: formatDuration(args.durationSeconds),
        musicbrainzRecordingId: null,
        musicbrainzReleaseId: null,
        recordingDateStart: null,
        recordingDateEnd: null,
        recordingLocation: null,
        releaseGroupId: null,
        legacySupabaseId: null,
      });
      await ctx.db.insert("recordingYoutubeItems", {
        recordingId,
        songId: args.songId,
        youtubeItemId,
        createdAt: new Date().toISOString(),
      });
    }

    const previousMembership = await loadSavedRecordingMembership(
      ctx,
      user._id,
      recordingId,
    );
    if (!previousMembership) {
      const memberships = await ctx.db
        .query("userRecordingData")
        .withIndex("by_userId_and_songId_and_sortOrder", (index) =>
          index.eq("userId", user._id).eq("songId", args.songId),
        )
        .take(500);
      const sortOrder = memberships.reduce(
        (highest, membership) => Math.max(highest, membership.sortOrder + 1),
        0,
      );
      await ctx.db.insert("userRecordingData", {
        userId: user._id,
        recordingId,
        songId: args.songId,
        notes: null,
        rating: null,
        sortOrder,
        tags: null,
        key: null,
        tempo: null,
        createdAt: new Date().toISOString(),
        legacyUserId: null,
        legacyRecordingId: null,
      });
    }

    return recordingId;
  },
});

export const update = mutation({
  args: {
    recordingId: v.id("recordings"),
    shared: sharedRecordingInputValidator,
    privateData: privateRecordingInputValidator,
  },
  returns: savedRecordingViewValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadSavedRecordingMembership(
      ctx,
      user._id,
      args.recordingId,
    );
    if (!membership) throw new Error("Saved Recording not found");
    const recording = await ctx.db.get(args.recordingId);
    if (!recording) throw new Error("Recording not found");

    const name = args.shared.name.trim();
    if (!name) throw new Error("A Recording name is required");
    const recordingDateStart = trimToNull(args.shared.recording_date_start);
    const recordingDateEnd = trimToNull(args.shared.recording_date_end);
    validateMusicDateRange(recordingDateStart, recordingDateEnd);
    const releaseGroupId = await resolveReleaseGroup(
      ctx,
      args.shared.release_group,
    );

    await ctx.db.patch(recording._id, {
      name,
      kind: args.shared.kind,
      artist: trimToNull(args.shared.artist),
      album: trimToNull(args.shared.album),
      year: trimToNull(args.shared.year),
      duration: trimToNull(args.shared.duration),
      musicbrainzRecordingId: trimToNull(
        args.shared.musicbrainz_recording_id,
      ),
      musicbrainzReleaseId: trimToNull(args.shared.musicbrainz_release_id),
      recordingDateStart,
      recordingDateEnd,
      recordingLocation: trimToNull(args.shared.recording_location),
      releaseGroupId,
    });
    await replaceAttribution(ctx, recording._id, args.shared.attribution);
    await replacePerformers(ctx, recording._id, args.shared.performers);
    await ctx.db.patch(membership._id, {
      notes: trimToNull(args.privateData.notes),
      rating: args.privateData.rating,
      sortOrder: args.privateData.sort_order ?? membership.sortOrder,
      tags: normalizeTags(args.privateData.tags),
      key: trimToNull(args.privateData.key),
      tempo: trimToNull(args.privateData.tempo),
    });
    const [savedRecording, savedMembership] = await Promise.all([
      ctx.db.get(recording._id),
      ctx.db.get(membership._id),
    ]);
    if (!savedRecording || !savedMembership) {
      throw new Error("Saved Recording disappeared during update");
    }
    return toSavedRecordingView(ctx, savedRecording, savedMembership);
  },
});

export const reorder = mutation({
  args: {
    songId: v.id("songs"),
    recordingIds: v.array(v.id("recordings")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (args.recordingIds.length > 500) {
      throw new Error("Too many Recordings to reorder");
    }
    if (new Set(args.recordingIds).size !== args.recordingIds.length) {
      throw new Error("Recording order contains duplicates");
    }

    const memberships = await ctx.db
      .query("userRecordingData")
      .withIndex("by_userId_and_songId_and_sortOrder", (index) =>
        index.eq("userId", user._id).eq("songId", args.songId),
      )
      .take(500);
    if (memberships.length !== args.recordingIds.length) {
      throw new Error("Recording order must include your complete Song list");
    }
    const byRecordingId = new Map(
      memberships.map((membership) => [membership.recordingId, membership]),
    );
    for (const [sortOrder, recordingId] of args.recordingIds.entries()) {
      const membership = byRecordingId.get(recordingId);
      if (!membership) throw new Error("Cannot reorder another User's Recording");
      await ctx.db.patch(membership._id, { sortOrder });
    }
    return null;
  },
});

export const unsave = mutation({
  args: { recordingId: v.id("recordings") },
  returns: v.null(),
  handler: async (ctx, { recordingId }) => {
    const user = await getCurrentUser(ctx);
    const membership = await loadSavedRecordingMembership(
      ctx,
      user._id,
      recordingId,
    );
    if (!membership) throw new Error("Saved Recording not found");
    await ctx.db.delete(membership._id);
    return null;
  },
});
