import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { v, type Infer } from "convex/values";
import { artistKindValidator, artistViewValidator } from "./songs";

const nullableString = v.union(v.string(), v.null());

export const recordingKindValidator = v.union(
  v.literal("released"),
  v.literal("video_capture"),
);

export const youtubeSearchCategoryValidator = v.union(
  v.literal("song"),
  v.literal("video"),
);

export const youtubeDiscoverySourceValidator = v.union(
  v.literal("ytmusic_search"),
  v.literal("youtube_search"),
  v.literal("manual_url"),
  v.literal("legacy_recording_url"),
);

export const releaseGroupInputValidator = v.object({
  title: v.string(),
  musicbrainz_release_group_id: v.string(),
});

export const performerInputValidator = v.object({
  name: v.string(),
  credited_as: v.string(),
  kind: artistKindValidator,
  musicbrainz_artist_id: v.string(),
});

export type PerformerInput = Infer<typeof performerInputValidator>;

export const sharedRecordingInputValidator = v.object({
  name: v.string(),
  kind: recordingKindValidator,
  artist: nullableString,
  album: nullableString,
  year: nullableString,
  duration: nullableString,
  musicbrainz_recording_id: nullableString,
  musicbrainz_release_id: nullableString,
  recording_date_start: nullableString,
  recording_date_end: nullableString,
  recording_location: nullableString,
  release_group: v.union(releaseGroupInputValidator, v.null()),
  performers: v.array(performerInputValidator),
});

export const privateRecordingInputValidator = v.object({
  key: nullableString,
  tempo: nullableString,
  notes: nullableString,
  rating: v.union(v.number(), v.null()),
  sort_order: v.union(v.number(), v.null()),
  tags: v.array(v.string()),
});

const releaseGroupViewValidator = v.object({
  id: v.id("releaseGroups"),
  title: v.string(),
  musicbrainz_release_group_id: v.string(),
});

const recordingArtistCreditViewValidator = v.object({
  id: v.id("recordingArtistCredits"),
  recording_id: v.id("recordings"),
  artist_id: v.id("artists"),
  role: v.literal("performer"),
  credited_as: v.string(),
  sort_order: v.number(),
  artists: artistViewValidator,
});

const youtubeItemViewValidator = v.object({
  video_id: v.string(),
  title: v.string(),
  channel_name: nullableString,
  search_category: youtubeSearchCategoryValidator,
  discovery_sources: v.array(youtubeDiscoverySourceValidator),
  ytmusic_artist_id: nullableString,
  ytmusic_artist_name: nullableString,
  ytmusic_album_id: nullableString,
  ytmusic_album_name: nullableString,
  duration_seconds: v.union(v.number(), v.null()),
  metadata_fetched_at: nullableString,
  association_created_at: v.string(),
});

export const savedRecordingViewValidator = v.object({
  id: v.id("recordings"),
  song_id: v.id("songs"),
  name: v.string(),
  kind: recordingKindValidator,
  artist: nullableString,
  year: nullableString,
  album: nullableString,
  duration: nullableString,
  musicbrainz_recording_id: nullableString,
  musicbrainz_release_id: nullableString,
  recording_date_start: nullableString,
  recording_date_end: nullableString,
  recording_location: nullableString,
  release_group_id: v.union(v.id("releaseGroups"), v.null()),
  release_groups: v.union(releaseGroupViewValidator, v.null()),
  recording_artist_credits: v.array(recordingArtistCreditViewValidator),
  user_data: v.object({
    user_id: v.id("users"),
    recording_id: v.id("recordings"),
    notes: nullableString,
    rating: v.union(v.number(), v.null()),
    sort_order: v.number(),
    tags: v.union(v.array(v.string()), v.null()),
    key: nullableString,
    tempo: nullableString,
  }),
  youtube_items: v.array(youtubeItemViewValidator),
});

export const recordingArtworkViewValidator = v.object({
  song_id: v.id("songs"),
  musicbrainz_release_id: nullableString,
  release_groups: v.union(
    v.object({ musicbrainz_release_group_id: v.string() }),
    v.null(),
  ),
  youtube_items: v.array(v.object({ video_id: v.string() })),
});

type ReadContext = Pick<QueryCtx | MutationCtx, "db">;

export const loadSavedRecordingMembership = async (
  ctx: ReadContext,
  userId: Id<"users">,
  recordingId: Id<"recordings">,
) =>
  ctx.db
    .query("userRecordingData")
    .withIndex("by_userId_and_recordingId", (query) =>
      query.eq("userId", userId).eq("recordingId", recordingId),
    )
    .unique();

const loadReleaseGroup = async (
  ctx: ReadContext,
  releaseGroupId: Id<"releaseGroups"> | null,
) => {
  if (!releaseGroupId) return null;
  const releaseGroup = await ctx.db.get(releaseGroupId);
  if (!releaseGroup) {
    throw new Error("Recording references a missing Release Group");
  }
  if (!releaseGroup.musicbrainzReleaseGroupId) {
    throw new Error("Saved Release Group is missing its provider identity");
  }
  return {
    id: releaseGroup._id,
    title: releaseGroup.title,
    musicbrainz_release_group_id:
      releaseGroup.musicbrainzReleaseGroupId,
  };
};

const loadPerformerCredits = async (
  ctx: ReadContext,
  recordingId: Id<"recordings">,
) => {
  const credits = await ctx.db
    .query("recordingArtistCredits")
    .withIndex("by_recordingId_and_sortOrder", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(100);

  return Promise.all(
    credits.map(async (credit) => {
      const artist = await ctx.db.get(credit.artistId);
      if (!artist) {
        throw new Error("Recording credit references a missing Artist");
      }
      return {
        id: credit._id,
        recording_id: recordingId,
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

const loadYouTubeItems = async (
  ctx: ReadContext,
  recordingId: Id<"recordings">,
) => {
  const associations = await ctx.db
    .query("recordingYoutubeItems")
    .withIndex("by_recordingId_and_createdAt", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(100);

  const items = await Promise.all(
    associations.map(async (association) => {
      const item = await ctx.db.get(association.youtubeItemId);
      if (!item) {
        throw new Error("Recording references a missing YouTube Item");
      }
      return {
        video_id: item.videoId,
        title: item.title,
        channel_name: item.channelName,
        search_category: item.searchCategory,
        discovery_sources: item.discoverySources,
        ytmusic_artist_id: item.ytmusicArtistId,
        ytmusic_artist_name: item.ytmusicArtistName,
        ytmusic_album_id: item.ytmusicAlbumId,
        ytmusic_album_name: item.ytmusicAlbumName,
        duration_seconds: item.durationSeconds,
        metadata_fetched_at: item.metadataFetchedAt,
        association_created_at: association.createdAt,
      };
    }),
  );

  return items.sort((left, right) => {
    if (left.search_category !== right.search_category) {
      return left.search_category === "song" ? -1 : 1;
    }
    return left.association_created_at.localeCompare(
      right.association_created_at,
    );
  });
};

export const toSavedRecordingView = async (
  ctx: ReadContext,
  recording: Doc<"recordings">,
  userData: Doc<"userRecordingData">,
) => ({
  id: recording._id,
  song_id: recording.songId,
  name: recording.name,
  kind: recording.kind,
  artist: recording.artist,
  year: recording.year,
  album: recording.album,
  duration: recording.duration,
  musicbrainz_recording_id: recording.musicbrainzRecordingId,
  musicbrainz_release_id: recording.musicbrainzReleaseId,
  recording_date_start: recording.recordingDateStart,
  recording_date_end: recording.recordingDateEnd,
  recording_location: recording.recordingLocation,
  release_group_id: recording.releaseGroupId,
  release_groups: await loadReleaseGroup(ctx, recording.releaseGroupId),
  recording_artist_credits: await loadPerformerCredits(ctx, recording._id),
  user_data: {
    user_id: userData.userId,
    recording_id: userData.recordingId,
    notes: userData.notes,
    rating: userData.rating,
    sort_order: userData.sortOrder,
    tags: userData.tags,
    key: userData.key,
    tempo: userData.tempo,
  },
  youtube_items: await loadYouTubeItems(ctx, recording._id),
});

export const toRecordingArtworkView = async (
  ctx: ReadContext,
  recording: Doc<"recordings">,
) => {
  const [releaseGroup, youtubeItems] = await Promise.all([
    loadReleaseGroup(ctx, recording.releaseGroupId),
    loadYouTubeItems(ctx, recording._id),
  ]);
  return {
    song_id: recording.songId,
    musicbrainz_release_id: recording.musicbrainzReleaseId,
    release_groups: releaseGroup
      ? {
          musicbrainz_release_group_id:
            releaseGroup.musicbrainz_release_group_id,
        }
      : null,
    youtube_items: youtubeItems.map((item) => ({
      video_id: item.video_id,
    })),
  };
};

const resolveArtist = async (ctx: MutationCtx, performer: PerformerInput) => {
  const musicbrainzArtistId = performer.musicbrainz_artist_id.trim();
  const creditedAs = performer.credited_as.trim();
  if (!musicbrainzArtistId || !creditedAs) {
    throw new Error(
      "A performer requires credited-as text and a MusicBrainz Artist ID",
    );
  }

  const existing = await ctx.db
    .query("artists")
    .withIndex("by_musicbrainzArtistId", (query) =>
      query.eq("musicbrainzArtistId", musicbrainzArtistId),
    )
    .unique();
  if (existing) {
    if (existing.kind === null && performer.kind !== null) {
      await ctx.db.patch(existing._id, { kind: performer.kind });
    }
    return existing._id;
  }

  return ctx.db.insert("artists", {
    name: performer.name.trim() || creditedAs,
    kind: performer.kind,
    musicbrainzArtistId,
    legacySupabaseId: null,
  });
};

export const replacePerformers = async (
  ctx: MutationCtx,
  recordingId: Id<"recordings">,
  performers: PerformerInput[],
) => {
  if (performers.length > 100) {
    throw new Error("A Recording cannot have more than 100 performer credits");
  }

  const existing = await ctx.db
    .query("recordingArtistCredits")
    .withIndex("by_recordingId", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(100);
  await Promise.all(existing.map((credit) => ctx.db.delete(credit._id)));

  for (const [sortOrder, performer] of performers.entries()) {
    const artistId = await resolveArtist(ctx, performer);
    await ctx.db.insert("recordingArtistCredits", {
      recordingId,
      artistId,
      role: "performer",
      creditedAs: performer.credited_as.trim(),
      sortOrder,
      legacySupabaseId: null,
    });
  }
};

export const normalizeTags = (tags: string[]) => {
  const byKey = new Map<string, string>();
  for (const value of tags) {
    const tag = value.trim();
    if (tag) byKey.set(tag.toLocaleLowerCase(), tag);
  }
  return byKey.size ? Array.from(byKey.values()) : null;
};

export const formatDuration = (seconds: number | null) => {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};
