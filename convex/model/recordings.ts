import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { v, type Infer } from "convex/values";
import { artistKindValidator, artistViewValidator } from "./songs";
import { formatRecordingArtistDisplay } from "../../src/utils/recordingAttribution";

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

export const personnelRelationshipTypeValidator = v.union(
  v.literal("instrument"),
  v.literal("vocal"),
  v.literal("performer"),
  v.literal("conductor"),
  v.literal("orchestra"),
);

export const personnelDetailValidator = v.object({
  canonical: v.string(),
  credited_as: nullableString,
});

export const personnelRelationshipValidator = v.object({
  type: personnelRelationshipTypeValidator,
  details: v.array(personnelDetailValidator),
});

const personnelCreditFields = {
  credited_as: v.string(),
  relationships: v.array(personnelRelationshipValidator),
};

export const personnelInputValidator = v.union(
  v.object({
    type: v.literal("existing"),
    artist_id: v.id("artists"),
    ...personnelCreditFields,
  }),
  v.object({
    type: v.literal("musicbrainz"),
    name: v.string(),
    kind: artistKindValidator,
    musicbrainz_artist_id: v.string(),
    ...personnelCreditFields,
  }),
);

export type PersonnelInput = Infer<typeof personnelInputValidator>;

const attributionCreditFields = {
  credited_as: v.string(),
  join_phrase: v.string(),
};

export const attributionInputValidator = v.union(
  v.object({
    type: v.literal("existing"),
    artist_id: v.id("artists"),
    ...attributionCreditFields,
  }),
  v.object({
    type: v.literal("musicbrainz"),
    name: v.string(),
    kind: artistKindValidator,
    musicbrainz_artist_id: v.string(),
    ...attributionCreditFields,
  }),
  v.object({
    type: v.literal("provider_unmatched"),
    name: v.string(),
    kind: artistKindValidator,
    ...attributionCreditFields,
  }),
);

export type AttributionInput = Infer<typeof attributionInputValidator>;

export const releaseGroupInputValidator = v.object({
  title: v.string(),
  musicbrainz_release_group_id: v.string(),
  attribution: v.array(attributionInputValidator),
});

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
  attribution: v.array(attributionInputValidator),
  personnel: v.array(personnelInputValidator),
});

export const privateRecordingInputValidator = v.object({
  key: nullableString,
  tempo: nullableString,
  notes: nullableString,
  rating: v.union(v.number(), v.null()),
  sort_order: v.union(v.number(), v.null()),
  tags: v.array(v.string()),
});

const personnelRelationshipViewValidator = v.object({
  type: personnelRelationshipTypeValidator,
  details: v.array(
    v.object({
      canonical: v.string(),
      credited_as: nullableString,
    }),
  ),
});

const recordingPersonnelViewValidator = v.object({
  recording_id: v.id("recordings"),
  artist_id: v.id("artists"),
  credited_as: v.string(),
  sort_order: v.number(),
  relationships: v.array(personnelRelationshipViewValidator),
  artists: artistViewValidator,
});

const recordingAttributionViewValidator = v.object({
  id: v.id("recordingArtistAttributions"),
  recording_id: v.id("recordings"),
  artist_id: v.id("artists"),
  credited_as: v.string(),
  join_phrase: v.string(),
  sort_order: v.number(),
  artists: artistViewValidator,
});

const releaseGroupAttributionViewValidator = v.object({
  release_group_id: v.id("releaseGroups"),
  artist_id: v.id("artists"),
  credited_as: v.string(),
  join_phrase: v.string(),
  sort_order: v.number(),
  artists: artistViewValidator,
});

const releaseGroupViewValidator = v.object({
  id: v.id("releaseGroups"),
  title: v.string(),
  musicbrainz_release_group_id: v.string(),
  artist_attributions: v.array(releaseGroupAttributionViewValidator),
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
  artist_attribution_fallback: nullableString,
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
  personnel: v.array(recordingPersonnelViewValidator),
  recording_artist_attributions: v.array(recordingAttributionViewValidator),
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
  const attribution = await loadReleaseGroupAttribution(ctx, releaseGroup._id);
  return {
    id: releaseGroup._id,
    title: releaseGroup.title,
    musicbrainz_release_group_id:
      releaseGroup.musicbrainzReleaseGroupId,
    artist_attributions: attribution,
  };
};

const loadReleaseGroupAttribution = async (
  ctx: ReadContext,
  releaseGroupId: Id<"releaseGroups">,
) => {
  const parts = await ctx.db
    .query("releaseGroupArtistAttributions")
    .withIndex("by_releaseGroupId_and_sortOrder", (query) =>
      query.eq("releaseGroupId", releaseGroupId),
    )
    .take(101);
  if (parts.length > 100) {
    throw new Error("Release Group Attribution exceeds 100 parts");
  }

  return Promise.all(
    parts.map(async (part) => {
      const artist = await ctx.db.get(part.artistId);
      if (!artist) {
        throw new Error("Release Group Attribution references a missing Artist");
      }
      return {
        release_group_id: releaseGroupId,
        artist_id: artist._id,
        credited_as: part.creditedAs,
        join_phrase: part.joinPhrase,
        sort_order: part.sortOrder,
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

export const loadPersonnel = async (
  ctx: ReadContext,
  recordingId: Id<"recordings">,
) => {
  const personnel = await ctx.db
    .query("recordingPersonnel")
    .withIndex("by_recordingId_and_sortOrder", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(101);
  if (personnel.length > 100) {
    throw new Error("Recording Personnel exceeds 100 Artists");
  }

  return Promise.all(
    personnel.map(async (entry) => {
      const artist = await ctx.db.get(entry.artistId);
      if (!artist) {
        throw new Error("Recording Personnel references a missing Artist");
      }
      return {
        recording_id: recordingId,
        artist_id: artist._id,
        credited_as: entry.creditedAs,
        sort_order: entry.sortOrder,
        relationships: entry.relationships.map((relationship) => ({
          type: relationship.type,
          details: relationship.details.map((detail) => ({
            canonical: detail.canonical,
            credited_as: detail.creditedAs,
          })),
        })),
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

const loadAttribution = async (
  ctx: ReadContext,
  recordingId: Id<"recordings">,
) => {
  const parts = await ctx.db
    .query("recordingArtistAttributions")
    .withIndex("by_recordingId_and_sortOrder", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(101);
  if (parts.length > 100) {
    throw new Error("Recording Attribution exceeds 100 parts");
  }

  return Promise.all(
    parts.map(async (part) => {
      const artist = await ctx.db.get(part.artistId);
      if (!artist) {
        throw new Error("Recording Attribution references a missing Artist");
      }
      return {
        id: part._id,
        recording_id: recordingId,
        artist_id: artist._id,
        credited_as: part.creditedAs,
        join_phrase: part.joinPhrase,
        sort_order: part.sortOrder,
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
) => {
  const [releaseGroup, personnel, attribution, youtubeItems] = await Promise.all([
    loadReleaseGroup(ctx, recording.releaseGroupId),
    loadPersonnel(ctx, recording._id),
    loadAttribution(ctx, recording._id),
    loadYouTubeItems(ctx, recording._id),
  ]);
  const providerHint = youtubeItems
    .map((item) => item.ytmusic_artist_name ?? item.channel_name)
    .find((value): value is string => Boolean(value?.trim()));

  return {
    id: recording._id,
    song_id: recording.songId,
    name: recording.name,
    kind: recording.kind,
    artist: formatRecordingArtistDisplay({
      attribution,
      fallback: recording.artist,
      providerHint,
      descriptor: recording.name,
    }),
    artist_attribution_fallback: recording.artist,
    year: recording.year,
    album: recording.album,
    duration: recording.duration,
    musicbrainz_recording_id: recording.musicbrainzRecordingId,
    musicbrainz_release_id: recording.musicbrainzReleaseId,
    recording_date_start: recording.recordingDateStart,
    recording_date_end: recording.recordingDateEnd,
    recording_location: recording.recordingLocation,
    release_group_id: recording.releaseGroupId,
    release_groups: releaseGroup,
    personnel,
    recording_artist_attributions: attribution,
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
    youtube_items: youtubeItems,
  };
};

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

type ArtistIdentityCreditInput = {
  name: string;
  credited_as: string;
  kind: Infer<typeof artistKindValidator>;
  musicbrainz_artist_id: string;
};

const resolveArtist = async (
  ctx: MutationCtx,
  credit: ArtistIdentityCreditInput,
) => {
  const musicbrainzArtistId = credit.musicbrainz_artist_id.trim();
  const creditedAs = credit.credited_as.trim();
  if (!musicbrainzArtistId || !creditedAs) {
    throw new Error(
      "An Artist credit requires credited-as text and a MusicBrainz Artist ID",
    );
  }

  const existing = await ctx.db
    .query("artists")
    .withIndex("by_musicbrainzArtistId", (query) =>
      query.eq("musicbrainzArtistId", musicbrainzArtistId),
    )
    .unique();
  if (existing) {
    if (existing.kind === null && credit.kind !== null) {
      await ctx.db.patch(existing._id, { kind: credit.kind });
    }
    return existing._id;
  }

  return ctx.db.insert("artists", {
    name: credit.name.trim() || creditedAs,
    kind: credit.kind,
    musicbrainzArtistId,
    legacySupabaseId: null,
  });
};

const normalizePersonnel = (personnel: PersonnelInput[]) => {
  if (personnel.length > 100) {
    throw new Error("A Recording cannot have more than 100 Personnel Artists");
  }

  let detailCount = 0;
  const normalized = personnel.map((entry) => {
    const creditedAs = entry.credited_as.trim();
    if (!creditedAs) {
      throw new Error("Recording Personnel requires credited-as Artist text");
    }
    if (entry.relationships.length === 0) {
      throw new Error("Recording Personnel requires at least one relationship");
    }

    const relationshipTypes = new Set<string>();
    const relationships = entry.relationships.map((relationship) => {
      if (relationshipTypes.has(relationship.type)) {
        throw new Error("Recording Personnel relationship types must be unique per Artist");
      }
      relationshipTypes.add(relationship.type);
      if (
        !["instrument", "vocal"].includes(relationship.type) &&
        relationship.details.length > 0
      ) {
        throw new Error(`${relationship.type} Personnel cannot have details`);
      }

      detailCount += Math.max(relationship.details.length, 1);
      const detailKeys = new Set<string>();
      const details = relationship.details.map((detail) => {
        const canonical = detail.canonical.trim();
        const creditedAs = detail.credited_as?.trim() || null;
        if (!canonical) {
          throw new Error("Recording Personnel detail requires canonical text");
        }
        const normalizedDetailText = (value: string) =>
          value.replace(/\s+/g, " ").toLocaleLowerCase();
        const key = `${normalizedDetailText(canonical)}\u0000${
          creditedAs ? normalizedDetailText(creditedAs) : ""
        }`;
        if (detailKeys.has(key)) {
          throw new Error("Recording Personnel contains a duplicate relationship detail");
        }
        detailKeys.add(key);
        return { canonical, creditedAs };
      });
      return { type: relationship.type, details };
    });
    if (relationshipTypes.has("performer") && relationshipTypes.size > 1) {
      throw new Error(
        "Recording Personnel cannot combine generic performer with specific evidence",
      );
    }

    return { entry, creditedAs, relationships };
  });
  if (detailCount > 500) {
    throw new Error("A Recording cannot have more than 500 Personnel details");
  }
  return normalized;
};

const resolvePersonnelArtist = async (
  ctx: MutationCtx,
  entry: PersonnelInput,
) => {
  if (entry.type === "existing") {
    const artist = await ctx.db.get(entry.artist_id);
    if (!artist) throw new Error("Recording Personnel references a missing Artist");
    return artist._id;
  }
  return resolveArtist(ctx, entry);
};

export const replacePersonnel = async (
  ctx: MutationCtx,
  recordingId: Id<"recordings">,
  personnel: PersonnelInput[],
) => {
  const normalized = normalizePersonnel(personnel);
  const resolved = [];
  const artistIds = new Set<Id<"artists">>();
  for (const entry of normalized) {
    const artistId = await resolvePersonnelArtist(ctx, entry.entry);
    if (artistIds.has(artistId)) {
      throw new Error("Recording Personnel cannot repeat an Artist");
    }
    artistIds.add(artistId);
    resolved.push({ ...entry, artistId });
  }

  const existing = await ctx.db
    .query("recordingPersonnel")
    .withIndex("by_recordingId", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(101);
  if (existing.length > 100) {
    throw new Error("Stored Recording Personnel exceeds 100 Artists");
  }
  await Promise.all(existing.map((entry) => ctx.db.delete(entry._id)));

  for (const [sortOrder, entry] of resolved.entries()) {
    await ctx.db.insert("recordingPersonnel", {
      recordingId,
      artistId: entry.artistId,
      creditedAs: entry.creditedAs,
      sortOrder,
      relationships: entry.relationships,
    });
  }
  await ctx.db.patch(recordingId, {
    personnelMigrated: true,
    personnelMigrationKind: "saved",
  });
};

export const replaceAttribution = async (
  ctx: MutationCtx,
  recordingId: Id<"recordings">,
  attribution: AttributionInput[],
) => {
  validateAttribution(attribution, "Recording");

  const existing = await ctx.db
    .query("recordingArtistAttributions")
    .withIndex("by_recordingId", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(101);
  if (existing.length > 100) {
    throw new Error("Recording Attribution exceeds 100 parts");
  }
  await Promise.all(existing.map((part) => ctx.db.delete(part._id)));

  for (const [sortOrder, part] of attribution.entries()) {
    const artistId = await resolveAttributionArtist(ctx, part);
    await ctx.db.insert("recordingArtistAttributions", {
      recordingId,
      artistId,
      creditedAs: part.credited_as,
      joinPhrase: part.join_phrase,
      sortOrder,
      legacySupabaseId: null,
    });
  }
};

export const replaceReleaseGroupAttribution = async (
  ctx: MutationCtx,
  releaseGroupId: Id<"releaseGroups">,
  attribution: AttributionInput[],
) => {
  validateAttribution(attribution, "Release Group");
  const existing = await ctx.db
    .query("releaseGroupArtistAttributions")
    .withIndex("by_releaseGroupId", (query) =>
      query.eq("releaseGroupId", releaseGroupId),
    )
    .take(101);
  if (existing.length > 100) {
    throw new Error("Release Group Attribution exceeds 100 parts");
  }
  await Promise.all(existing.map((part) => ctx.db.delete(part._id)));

  for (const [sortOrder, part] of attribution.entries()) {
    await ctx.db.insert("releaseGroupArtistAttributions", {
      releaseGroupId,
      artistId: await resolveAttributionArtist(ctx, part),
      creditedAs: part.credited_as,
      joinPhrase: part.join_phrase,
      sortOrder,
      legacySupabaseId: null,
    });
  }
};

const validateAttribution = (
  attribution: AttributionInput[],
  subject: "Recording" | "Release Group",
) => {
  if (attribution.length > 100) {
    throw new Error(`A ${subject} cannot have more than 100 Attribution parts`);
  }
  for (const part of attribution) {
    if (!part.credited_as.trim()) {
      throw new Error("An Attribution part requires credited-as text");
    }
    if (
      (part.type === "musicbrainz" || part.type === "provider_unmatched") &&
      !part.name.trim()
    ) {
      throw new Error("An Attribution part requires an Artist name");
    }
    if (part.type === "musicbrainz" && !part.musicbrainz_artist_id.trim()) {
      throw new Error("A MusicBrainz Attribution part requires a MusicBrainz Artist ID");
    }
  }
};

const resolveAttributionArtist = async (
  ctx: MutationCtx,
  part: AttributionInput,
) =>
  part.type === "existing"
    ? resolveExistingArtist(ctx, part.artist_id)
    : part.type === "musicbrainz"
      ? resolveArtist(ctx, {
          name: part.name,
          credited_as: part.credited_as,
          kind: part.kind,
          musicbrainz_artist_id: part.musicbrainz_artist_id,
        })
      : createProviderUnmatchedArtist(ctx, part);

const resolveExistingArtist = async (
  ctx: MutationCtx,
  artistId: Id<"artists">,
) => {
  const artist = await ctx.db.get(artistId);
  if (!artist) throw new Error("Recording Attribution references a missing Artist");
  return artist._id;
};

const createProviderUnmatchedArtist = async (
  ctx: MutationCtx,
  part: Extract<AttributionInput, { type: "provider_unmatched" }>,
) =>
  ctx.db.insert("artists", {
    name: part.name.trim(),
    kind: part.kind,
    musicbrainzArtistId: null,
    legacySupabaseId: null,
  });

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
