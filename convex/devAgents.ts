import { internalMutation, env } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  devAgentConfig,
  assertDevAgentTarget,
} from "../src/utils/devAgentAccounts";
import type {
  DevAgentProfile,
  DevAgentConfig,
} from "../src/utils/devAgentAccounts";
import {
  projectRecordingForUser,
  projectSongForUser,
} from "./model/artistRepertoire";

const ensureUser = async (
  ctx: MutationCtx,
  subject: string,
  profile: DevAgentProfile,
  config: DevAgentConfig,
) => {
  if (!/^user_[a-zA-Z0-9]+$/.test(subject))
    throw new Error("Invalid Clerk test User ID");
  const email = config.accounts[profile].email;
  const tokenIdentifier = `${config.target.clerkIssuer}|${subject}`;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", subject))
    .unique();
  if (existing) {
    const emailMatches = existing.email === email;
    const roleMatches = existing.role === profile;
    if (
      existing.clerkTokenIdentifier !== tokenIdentifier ||
      // A matching role may authorize rotating only the email. A matching
      // email may authorize initial role setup. Never change both at once.
      (!emailMatches && !roleMatches)
    ) {
      throw new Error("Refusing to change an unrelated application User");
    }
    if (!emailMatches || !roleMatches) {
      await ctx.db.patch(existing._id, {
        email,
        role: profile,
      });
    }
    return existing._id;
  }
  return ctx.db.insert("users", {
    clerkSubject: subject,
    clerkTokenIdentifier: tokenIdentifier,
    email,
    role: profile,
    artistRepertoireProjectedAt: new Date().toISOString(),
  });
};

const ensureSong = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  profile: DevAgentProfile,
  key: "shared" | "private",
  sharedId?: Id<"songs">,
) => {
  const requestId = `standards-dev-agent-v1:${key}`;
  const existing = await ctx.db
    .query("songUserData")
    .withIndex("by_userId_and_creationRequestId", (q) =>
      q.eq("userId", userId).eq("creationRequestId", requestId),
    )
    .unique();
  if (existing) {
    if (!(await ctx.db.get(existing.songId)))
      throw new Error(
        "Demo Song was deleted; review fixtures before reseeding",
      );
    if (sharedId && existing.songId !== sharedId)
      throw new Error("Demo shared Song identities differ");
    await projectSongForUser(ctx, userId, existing.songId);
    return existing.songId;
  }
  const songId =
    sharedId ??
    (await ctx.db.insert("songs", {
      name:
        key === "shared"
          ? "Agent demo: shared Song"
          : `Agent demo: ${profile} private Song`,
      year: null,
      wikipediaExtract: null,
      wikipediaUrl: null,
      musicbrainzWorkId: null,
      workDateStart: null,
      workDateEnd: null,
      isDiscoverable: false,
      firstDiscoverableAt: null,
    }));
  await ctx.db.insert("songUserData", {
    userId,
    songId,
    notes: `${profile.toUpperCase()} ONLY: private demo notes`,
    displayTitle: null,
    favorite: key === "shared",
    tags: ["Agent demo"],
    createdAt: new Date().toISOString(),
    creationRequestId: requestId,
  });
  await projectSongForUser(ctx, userId, songId);
  return songId;
};

const ensureRecordings = async (ctx: MutationCtx, songId: Id<"songs">) => {
  const existing = await ctx.db
    .query("recordings")
    .withIndex("by_songId", (q) => q.eq("songId", songId))
    .take(101);
  if (existing.length > 100)
    throw new Error("Demo Song has too many Recordings to seed safely");
  const recordings: Id<"recordings">[] = [];
  // Clearly marked, silent fixtures. These credits are demo data, not catalog claims.
  for (const artist of [
    {
      name: "The Beatles",
      kind: "group" as const,
      mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
    },
    {
      name: "Paul McCartney",
      kind: "person" as const,
      mbid: "ba550d0e-adac-4864-b88b-407cab5e76af",
    },
  ]) {
    const name = `Agent demo: ${artist.kind} Recording (no audio)`;
    const recording = existing.find((item) => item.name === name);
    if (recording) {
      recordings.push(recording._id);
      continue;
    }
    const existingArtist = await ctx.db
      .query("artists")
      .withIndex("by_musicbrainzArtistId", (q) =>
        q.eq("musicbrainzArtistId", artist.mbid),
      )
      .unique();
    const artistId =
      existingArtist?._id ??
      (await ctx.db.insert("artists", {
        name: artist.name,
        kind: artist.kind,
        musicbrainzArtistId: artist.mbid,
      }));
    const recordingId = await ctx.db.insert("recordings", {
      songId,
      name,
      kind: "released",
      artist: null,
      year: null,
      album: null,
      duration: null,
      musicbrainzRecordingId: null,
      musicbrainzReleaseId: null,
      recordingDateStart: null,
      recordingDateEnd: null,
      recordingLocation: null,
      releaseGroupId: null,
      personnelMigrated: true,
    });
    await ctx.db.insert("recordingArtistAttributions", {
      recordingId,
      artistId,
      creditedAs: artist.name,
      joinPhrase: "",
      sortOrder: 0,
    });
    recordings.push(recordingId);
  }
  return recordings;
};

export const seed = internalMutation({
  args: { userSubject: v.string(), adminSubject: v.string() },
  returns: v.object({
    users: v.number(),
    demoSongs: v.number(),
    demoRecordings: v.number(),
  }),
  handler: async (ctx, args) => {
    const config = devAgentConfig(env);
    assertDevAgentTarget(
      config.target,
      process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
      process.env.CONVEX_CLOUD_URL ?? "",
    );
    if (args.userSubject === args.adminSubject)
      throw new Error("Dev accounts must be distinct");
    const userId = await ensureUser(ctx, args.userSubject, "user", config);
    const adminId = await ensureUser(ctx, args.adminSubject, "admin", config);
    const sharedId = await ensureSong(ctx, userId, "user", "shared");
    await ensureSong(ctx, adminId, "admin", "shared", sharedId);
    await ensureSong(ctx, userId, "user", "private");
    await ensureSong(ctx, adminId, "admin", "private");
    const recordingIds = await ensureRecordings(ctx, sharedId);
    for (const [profile, accountId] of [
      ["user", userId],
      ["admin", adminId],
    ] as const) {
      for (const [sortOrder, recordingId] of recordingIds.entries()) {
        const saved = await ctx.db
          .query("userRecordingData")
          .withIndex("by_userId_and_recordingId", (q) =>
            q.eq("userId", accountId).eq("recordingId", recordingId),
          )
          .unique();
        if (!saved) {
          await ctx.db.insert("userRecordingData", {
            userId: accountId,
            recordingId,
            songId: sharedId,
            notes: `${profile.toUpperCase()} ONLY: private demo Recording notes`,
            rating: null,
            sortOrder,
            tags: ["Agent demo"],
            key: null,
            tempo: null,
            createdAt: new Date().toISOString(),
          });
        }
        await projectRecordingForUser(ctx, accountId, recordingId);
      }
    }
    const artistRepertoireProjectedAt = new Date().toISOString();
    await Promise.all([
      ctx.db.patch(userId, { artistRepertoireProjectedAt }),
      ctx.db.patch(adminId, { artistRepertoireProjectedAt }),
    ]);
    return { users: 2, demoSongs: 3, demoRecordings: recordingIds.length };
  },
});
