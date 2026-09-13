import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { v, type Infer } from "convex/values";

export const recordingRelationshipReasonValidator = v.union(
  v.literal("release_group_attribution"),
  v.literal("attribution"),
  v.literal("personnel"),
);

export type RecordingRelationshipReason = Infer<
  typeof recordingRelationshipReasonValidator
>;

const adjustSummary = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  artistId: Id<"artists">,
  delta: { songCount?: number; recordingCount?: number },
) => {
  const summary = await ctx.db
    .query("artistRepertoireSummaries")
    .withIndex("by_userId_and_artistId", (query) =>
      query.eq("userId", userId).eq("artistId", artistId),
    )
    .unique();
  const songCount = (summary?.songCount ?? 0) + (delta.songCount ?? 0);
  const recordingCount =
    (summary?.recordingCount ?? 0) + (delta.recordingCount ?? 0);
  if (songCount < 0 || recordingCount < 0) {
    throw new Error(
      "Artist repertoire summary is inconsistent with its entries",
    );
  }
  if (songCount === 0 && recordingCount === 0) {
    if (summary) await ctx.db.delete(summary._id);
    return;
  }
  if (summary) {
    await ctx.db.patch(summary._id, { songCount, recordingCount });
  } else {
    await ctx.db.insert("artistRepertoireSummaries", {
      userId,
      artistId,
      songCount,
      recordingCount,
    });
  }
};

const applySummaryDeltas = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  deltas: Map<Id<"artists">, { songCount: number; recordingCount: number }>,
) => {
  for (const [artistId, delta] of deltas) {
    if (delta.songCount !== 0 || delta.recordingCount !== 0) {
      await adjustSummary(ctx, userId, artistId, delta);
    }
  }
};

const addDelta = (
  deltas: Map<Id<"artists">, { songCount: number; recordingCount: number }>,
  artistId: Id<"artists">,
  field: "songCount" | "recordingCount",
  amount: number,
) => {
  const delta = deltas.get(artistId) ?? { songCount: 0, recordingCount: 0 };
  delta[field] += amount;
  deltas.set(artistId, delta);
};

export const loadSongArtistIds = async (
  ctx: Pick<MutationCtx, "db">,
  songId: Id<"songs">,
) => {
  const credits = await ctx.db
    .query("songArtistCredits")
    .withIndex("by_songId", (query) => query.eq("songId", songId))
    .take(26);
  if (credits.length > 25) {
    throw new Error("Song exceeds 25 writer credits");
  }
  return new Set(credits.map((credit) => credit.artistId));
};

export const projectSongForUser = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  songId: Id<"songs">,
) => {
  const membership = await ctx.db
    .query("songUserData")
    .withIndex("by_userId_and_songId", (query) =>
      query.eq("userId", userId).eq("songId", songId),
    )
    .unique();
  const expectedArtistIds = membership
    ? await loadSongArtistIds(ctx, songId)
    : new Set<Id<"artists">>();
  const existing = await ctx.db
    .query("artistSongRepertoireEntries")
    .withIndex("by_userId_and_songId", (query) =>
      query.eq("userId", userId).eq("songId", songId),
    )
    .take(26);
  if (existing.length > 25) {
    throw new Error("Song projection exceeds 25 Artists");
  }

  const kept = new Set<Id<"artists">>();
  const deltas = new Map<
    Id<"artists">,
    { songCount: number; recordingCount: number }
  >();
  for (const entry of existing) {
    if (expectedArtistIds.has(entry.artistId) && !kept.has(entry.artistId)) {
      kept.add(entry.artistId);
      continue;
    }
    await ctx.db.delete(entry._id);
    addDelta(deltas, entry.artistId, "songCount", -1);
  }
  for (const artistId of expectedArtistIds) {
    if (kept.has(artistId)) continue;
    await ctx.db.insert("artistSongRepertoireEntries", {
      userId,
      artistId,
      songId,
    });
    addDelta(deltas, artistId, "songCount", 1);
  }
  await applySummaryDeltas(ctx, userId, deltas);
};

export const loadRecordingArtistRelationships = async (
  ctx: Pick<MutationCtx | QueryCtx, "db">,
  recording: Doc<"recordings">,
) => {
  const [releaseGroupAttribution, attribution, personnel] = await Promise.all([
    recording.releaseGroupId
      ? ctx.db
          .query("releaseGroupArtistAttributions")
          .withIndex("by_releaseGroupId", (query) =>
            query.eq("releaseGroupId", recording.releaseGroupId!),
          )
          .take(101)
      : Promise.resolve([]),
    ctx.db
      .query("recordingArtistAttributions")
      .withIndex("by_recordingId", (query) =>
        query.eq("recordingId", recording._id),
      )
      .take(101),
    ctx.db
      .query("recordingPersonnel")
      .withIndex("by_recordingId", (query) =>
        query.eq("recordingId", recording._id),
      )
      .take(101),
  ]);
  if (releaseGroupAttribution.length > 100) {
    throw new Error("Release Group Attribution exceeds 100 parts");
  }
  if (attribution.length > 100) {
    throw new Error("Recording Attribution exceeds 100 parts");
  }
  if (personnel.length > 100) {
    throw new Error("Recording Personnel exceeds 100 Artists");
  }

  const reasons = new Map<Id<"artists">, Set<RecordingRelationshipReason>>();
  const add = (
    artistId: Id<"artists">,
    reason: RecordingRelationshipReason,
  ) => {
    const artistReasons = reasons.get(artistId) ?? new Set();
    artistReasons.add(reason);
    reasons.set(artistId, artistReasons);
  };
  for (const part of releaseGroupAttribution) {
    add(part.artistId, "release_group_attribution");
  }
  for (const part of attribution) add(part.artistId, "attribution");
  for (const entry of personnel) add(entry.artistId, "personnel");

  const reasonOrder: RecordingRelationshipReason[] = [
    "release_group_attribution",
    "attribution",
    "personnel",
  ];
  return new Map(
    [...reasons].map(([artistId, artistReasons]) => [
      artistId,
      reasonOrder.filter((reason) => artistReasons.has(reason)),
    ]),
  );
};

export const projectRecordingForUser = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  recordingId: Id<"recordings">,
) => {
  const membership = await ctx.db
    .query("userRecordingData")
    .withIndex("by_userId_and_recordingId", (query) =>
      query.eq("userId", userId).eq("recordingId", recordingId),
    )
    .unique();
  const recording = membership ? await ctx.db.get(recordingId) : null;
  if (membership && !recording) {
    throw new Error("Saved Recording references a missing Recording");
  }
  const expected = recording
    ? await loadRecordingArtistRelationships(ctx, recording)
    : new Map<Id<"artists">, RecordingRelationshipReason[]>();
  const existing = await ctx.db
    .query("artistRecordingRepertoireEntries")
    .withIndex("by_userId_and_recordingId", (query) =>
      query.eq("userId", userId).eq("recordingId", recordingId),
    )
    .take(301);
  if (existing.length > 300) {
    throw new Error("Recording projection exceeds 300 Artists");
  }

  const kept = new Set<Id<"artists">>();
  const deltas = new Map<
    Id<"artists">,
    { songCount: number; recordingCount: number }
  >();
  for (const entry of existing) {
    const relationshipReasons = expected.get(entry.artistId);
    if (relationshipReasons && !kept.has(entry.artistId)) {
      kept.add(entry.artistId);
      if (
        entry.songId !== recording!.songId ||
        entry.relationshipReasons.join("\u0000") !==
          relationshipReasons.join("\u0000")
      ) {
        await ctx.db.patch(entry._id, {
          songId: recording!.songId,
          relationshipReasons,
        });
      }
      continue;
    }
    await ctx.db.delete(entry._id);
    addDelta(deltas, entry.artistId, "recordingCount", -1);
  }
  for (const [artistId, relationshipReasons] of expected) {
    if (kept.has(artistId)) continue;
    await ctx.db.insert("artistRecordingRepertoireEntries", {
      userId,
      artistId,
      recordingId,
      songId: recording!.songId,
      relationshipReasons,
    });
    addDelta(deltas, artistId, "recordingCount", 1);
  }
  await applySummaryDeltas(ctx, userId, deltas);
};

const sortedIds = (ids: string[]) => [...ids].sort();

export const verifySongProjection = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  songId: Id<"songs">,
) => {
  const membership = await ctx.db
    .query("songUserData")
    .withIndex("by_userId_and_songId", (query) =>
      query.eq("userId", userId).eq("songId", songId),
    )
    .unique();
  const expectedArtistIds = membership
    ? await loadSongArtistIds(ctx, songId)
    : new Set<Id<"artists">>();
  const expected = sortedIds([...expectedArtistIds]);
  const entries = await ctx.db
    .query("artistSongRepertoireEntries")
    .withIndex("by_userId_and_songId", (query) =>
      query.eq("userId", userId).eq("songId", songId),
    )
    .take(26);
  const actual = sortedIds(entries.map((entry) => entry.artistId));
  if (expected.join("\u0000") !== actual.join("\u0000")) {
    throw new Error(
      "Artist Song repertoire projection does not match its source",
    );
  }
  for (const artistId of expectedArtistIds) {
    const summary = await ctx.db
      .query("artistRepertoireSummaries")
      .withIndex("by_userId_and_artistId", (query) =>
        query.eq("userId", userId).eq("artistId", artistId),
      )
      .unique();
    if (!summary || summary.songCount < 1) {
      throw new Error("Artist Song repertoire entry is missing its summary");
    }
  }
};

export const verifyRecordingProjection = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  recordingId: Id<"recordings">,
) => {
  const membership = await ctx.db
    .query("userRecordingData")
    .withIndex("by_userId_and_recordingId", (query) =>
      query.eq("userId", userId).eq("recordingId", recordingId),
    )
    .unique();
  const recording = membership ? await ctx.db.get(recordingId) : null;
  if (membership && !recording) {
    throw new Error("Saved Recording references a missing Recording");
  }
  const expected = recording
    ? await loadRecordingArtistRelationships(ctx, recording)
    : new Map<Id<"artists">, RecordingRelationshipReason[]>();
  const entries = await ctx.db
    .query("artistRecordingRepertoireEntries")
    .withIndex("by_userId_and_recordingId", (query) =>
      query.eq("userId", userId).eq("recordingId", recordingId),
    )
    .take(301);
  if (entries.length !== expected.size) {
    throw new Error(
      "Artist Recording repertoire projection count is incorrect",
    );
  }
  for (const entry of entries) {
    const reasons = expected.get(entry.artistId);
    if (
      !recording ||
      entry.songId !== recording.songId ||
      !reasons ||
      entry.relationshipReasons.join("\u0000") !== reasons.join("\u0000")
    ) {
      throw new Error(
        "Artist Recording repertoire projection does not match its source",
      );
    }
    const summary = await ctx.db
      .query("artistRepertoireSummaries")
      .withIndex("by_userId_and_artistId", (query) =>
        query.eq("userId", userId).eq("artistId", entry.artistId),
      )
      .unique();
    if (!summary || summary.recordingCount < 1) {
      throw new Error(
        "Artist Recording repertoire entry is missing its summary",
      );
    }
  }
};

const summaryVerificationLimit = 10_000;

export const verifyArtistRepertoireSummary = async (
  ctx: MutationCtx,
  summary: Doc<"artistRepertoireSummaries">,
) => {
  const duplicates = await ctx.db
    .query("artistRepertoireSummaries")
    .withIndex("by_userId_and_artistId", (query) =>
      query.eq("userId", summary.userId).eq("artistId", summary.artistId),
    )
    .take(2);
  if (
    duplicates.length !== 1 ||
    duplicates[0]?._id !== summary._id ||
    (summary.songCount === 0 && summary.recordingCount === 0)
  ) {
    throw new Error("Artist repertoire summary is not unique and reachable");
  }
  if (
    summary.songCount > summaryVerificationLimit ||
    summary.recordingCount > summaryVerificationLimit
  ) {
    throw new Error("Artist repertoire summary exceeds the verification bound");
  }
  const [songs, recordings] = await Promise.all([
    ctx.db
      .query("artistSongRepertoireEntries")
      .withIndex("by_userId_and_artistId", (query) =>
        query.eq("userId", summary.userId).eq("artistId", summary.artistId),
      )
      .take(summaryVerificationLimit + 1),
    ctx.db
      .query("artistRecordingRepertoireEntries")
      .withIndex("by_userId_and_artistId", (query) =>
        query.eq("userId", summary.userId).eq("artistId", summary.artistId),
      )
      .take(summaryVerificationLimit + 1),
  ]);
  if (
    songs.length !== summary.songCount ||
    recordings.length !== summary.recordingCount
  ) {
    throw new Error(
      "Artist repertoire summary counts do not match its entries",
    );
  }
  if (
    !(await ctx.db.get(summary.userId)) ||
    !(await ctx.db.get(summary.artistId))
  ) {
    throw new Error(
      "Artist repertoire summary references a missing source row",
    );
  }
};

type ReconciliationSource =
  | { kind: "song"; songId: Id<"songs"> }
  | { kind: "recording"; recordingId: Id<"recordings"> }
  | { kind: "release_group"; releaseGroupId: Id<"releaseGroups"> };

const enqueueReconciliation = async (
  ctx: MutationCtx,
  source: ReconciliationSource,
) => {
  const sourceId =
    source.kind === "song"
      ? source.songId
      : source.kind === "recording"
        ? source.recordingId
        : source.releaseGroupId;
  const sourceKey = `${source.kind}:${sourceId}`;
  const existing = await ctx.db
    .query("artistRepertoireReconciliationJobs")
    .withIndex("by_sourceKey", (query) => query.eq("sourceKey", sourceKey))
    .unique();
  const fields = {
    sourceKey,
    kind: source.kind,
    songId: source.kind === "song" ? source.songId : null,
    recordingId: source.kind === "recording" ? source.recordingId : null,
    releaseGroupId:
      source.kind === "release_group" ? source.releaseGroupId : null,
    cursor: null,
  } as const;
  const jobId = existing
    ? (await ctx.db.patch(existing._id, fields), existing._id)
    : await ctx.db.insert("artistRepertoireReconciliationJobs", fields);
  await ctx.scheduler.runAfter(
    0,
    internal.artistRepertoire.processReconciliation,
    { jobId },
  );
};

export const enqueueSongReconciliation = (
  ctx: MutationCtx,
  songId: Id<"songs">,
) => enqueueReconciliation(ctx, { kind: "song", songId });

export const enqueueRecordingReconciliation = (
  ctx: MutationCtx,
  recordingId: Id<"recordings">,
) => enqueueReconciliation(ctx, { kind: "recording", recordingId });

export const enqueueReleaseGroupReconciliation = (
  ctx: MutationCtx,
  releaseGroupId: Id<"releaseGroups">,
) => enqueueReconciliation(ctx, { kind: "release_group", releaseGroupId });
