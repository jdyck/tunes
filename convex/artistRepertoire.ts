import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  enqueueRecordingReconciliation,
  projectRecordingForUser,
  projectSongForUser,
} from "./model/artistRepertoire";

const scheduleContinuation = async (
  ctx: Parameters<typeof projectSongForUser>[0],
  jobId: Id<"artistRepertoireReconciliationJobs">,
) => {
  await ctx.scheduler.runAfter(
    0,
    internal.artistRepertoire.processReconciliation,
    { jobId },
  );
};

export const processReconciliation = internalMutation({
  args: { jobId: v.id("artistRepertoireReconciliationJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }): Promise<null> => {
    const job = await ctx.db.get(jobId);
    if (!job) return null;

    if (job.kind === "song") {
      if (!job.songId)
        throw new Error("Song reconciliation is missing its source");
      const memberships = await ctx.db
        .query("songUserData")
        .withIndex("by_songId", (query) => query.eq("songId", job.songId!))
        .paginate({ cursor: job.cursor, numItems: 16 });
      for (const membership of memberships.page) {
        await projectSongForUser(ctx, membership.userId, membership.songId);
      }
      if (memberships.isDone) {
        await ctx.db.delete(jobId);
      } else {
        await ctx.db.patch(jobId, { cursor: memberships.continueCursor });
        await scheduleContinuation(ctx, jobId);
      }
      return null;
    }

    if (job.kind === "recording") {
      if (!job.recordingId) {
        throw new Error("Recording reconciliation is missing its source");
      }
      const memberships = await ctx.db
        .query("userRecordingData")
        .withIndex("by_recordingId", (query) =>
          query.eq("recordingId", job.recordingId!),
        )
        .paginate({ cursor: job.cursor, numItems: 4 });
      for (const membership of memberships.page) {
        await projectRecordingForUser(
          ctx,
          membership.userId,
          membership.recordingId,
        );
      }
      if (memberships.isDone) {
        await ctx.db.delete(jobId);
      } else {
        await ctx.db.patch(jobId, { cursor: memberships.continueCursor });
        await scheduleContinuation(ctx, jobId);
      }
      return null;
    }

    if (!job.releaseGroupId) {
      throw new Error("Release Group reconciliation is missing its source");
    }
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_releaseGroupId", (query) =>
        query.eq("releaseGroupId", job.releaseGroupId!),
      )
      .paginate({ cursor: job.cursor, numItems: 20 });
    for (const recording of recordings.page) {
      await enqueueRecordingReconciliation(ctx, recording._id);
    }
    if (recordings.isDone) {
      await ctx.db.delete(jobId);
    } else {
      await ctx.db.patch(jobId, { cursor: recordings.continueCursor });
      await scheduleContinuation(ctx, jobId);
    }
    return null;
  },
});

export const resumeReconciliation = internalMutation({
  args: { jobId: v.id("artistRepertoireReconciliationJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    if (await ctx.db.get(jobId)) await scheduleContinuation(ctx, jobId);
    return null;
  },
});
