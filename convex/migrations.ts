import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { normalizePersonnelText } from "./model/recordings";

export const migrations = new Migrations(components.migrations, {
  internalMutation,
});

const loadLegacyCredits = async (
  ctx: Pick<MutationCtx, "db">,
  recordingId: Id<"recordings">,
) => {
  const credits = await ctx.db
    .query("recordingArtistCredits")
    .withIndex("by_recordingId_and_sortOrder", (query) =>
      query.eq("recordingId", recordingId),
    )
    .take(101);
  if (credits.length > 100) {
    throw new Error("Legacy Recording Personnel exceeds 100 Artists");
  }
  return credits;
};

const loadTargetPersonnel = async (
  ctx: Pick<MutationCtx, "db">,
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
  return personnel;
};

export const backfillRecordingPersonnel = migrations.define({
  table: "recordings",
  batchSize: 25,
  migrateOne: async (ctx, recording) => {
    if (recording.personnelMigrated) return;

    const [legacyCredits, targetPersonnel] = await Promise.all([
      loadLegacyCredits(ctx, recording._id),
      loadTargetPersonnel(ctx, recording._id),
    ]);
    if (targetPersonnel.length > 0) {
      throw new Error(
        "Unmarked Recording already has target Personnel; verify it before migration",
      );
    }

    const firstCreditByArtist = new Map<
      Id<"artists">,
      (typeof legacyCredits)[number]
    >();
    for (const credit of legacyCredits) {
      if (!firstCreditByArtist.has(credit.artistId)) {
        firstCreditByArtist.set(credit.artistId, credit);
      }
    }
    for (const [sortOrder, credit] of [
      ...firstCreditByArtist.values(),
    ].entries()) {
      const artist = await ctx.db.get(credit.artistId);
      if (!artist) {
        throw new Error("Legacy Recording Personnel references a missing Artist");
      }
      const creditedAs = credit.creditedAs.trim();
      if (!creditedAs) {
        throw new Error("Legacy Recording Personnel requires credited-as text");
      }
      await ctx.db.insert("recordingPersonnel", {
        recordingId: recording._id,
        artistId: credit.artistId,
        creditedAs,
        sortOrder,
        relationships: [{ type: "performer", details: [] }],
      });
    }
    await ctx.db.patch(recording._id, {
      personnelMigrated: true,
      personnelMigrationKind: "legacy_backfill",
    });
  },
});

export const verifyRecordingPersonnel = migrations.define({
  table: "recordings",
  batchSize: 25,
  migrateOne: async (ctx, recording) => {
    if (!recording.personnelMigrated) {
      throw new Error("Recording Personnel migration is incomplete");
    }
    const [legacyCredits, personnel] = await Promise.all([
      loadLegacyCredits(ctx, recording._id),
      loadTargetPersonnel(ctx, recording._id),
    ]);
    const targetByArtist = new Map(personnel.map((entry) => [entry.artistId, entry]));
    if (targetByArtist.size !== personnel.length) {
      throw new Error("Recording Personnel contains duplicate Artists");
    }

    let detailCount = 0;
    for (const entry of personnel) {
      const artist = await ctx.db.get(entry.artistId);
      if (!artist) {
        throw new Error("Recording Personnel references a missing Artist");
      }
      if (!entry.creditedAs.trim()) {
        throw new Error("Recording Personnel requires credited-as Artist text");
      }
      if (entry.relationships.length === 0) {
        throw new Error("Recording Personnel requires a relationship");
      }
      const relationshipTypes = new Set<string>();
      for (const relationship of entry.relationships) {
        if (relationshipTypes.has(relationship.type)) {
          throw new Error("Recording Personnel contains duplicate relationship types");
        }
        relationshipTypes.add(relationship.type);
        if (
          relationship.type !== "instrument" &&
          relationship.type !== "vocal" &&
          relationship.details.length > 0
        ) {
          throw new Error("Recording Personnel contains an invalid relationship shape");
        }
        detailCount += Math.max(relationship.details.length, 1);
        const details = new Set<string>();
        for (const detail of relationship.details) {
          if (!detail.canonical.trim()) {
            throw new Error("Recording Personnel detail requires canonical text");
          }
          const key = `${normalizePersonnelText(detail.canonical)}\u0000${
            detail.creditedAs ? normalizePersonnelText(detail.creditedAs) : ""
          }`;
          if (details.has(key)) {
            throw new Error("Recording Personnel contains duplicate details");
          }
          details.add(key);
        }
      }
      if (relationshipTypes.has("performer") && relationshipTypes.size > 1) {
        throw new Error(
          "Recording Personnel combines generic and specific relationships",
        );
      }
    }
    if (detailCount > 500) {
      throw new Error("Recording has more than 500 Personnel details");
    }

    if (recording.personnelMigrationKind === "legacy_backfill") {
      const legacyByArtist = new Map<
        Id<"artists">,
        (typeof legacyCredits)[number]
      >();
      for (const credit of legacyCredits) {
        if (!legacyByArtist.has(credit.artistId)) {
          legacyByArtist.set(credit.artistId, credit);
        }
      }
      if (legacyByArtist.size !== personnel.length) {
        throw new Error("Backfilled Recording Personnel count does not match legacy source");
      }
      for (const [artistId, credit] of legacyByArtist) {
        const target = targetByArtist.get(artistId);
        if (
          !target ||
          target.creditedAs !== credit.creditedAs.trim() ||
          target.relationships.length !== 1 ||
          target.relationships[0]?.type !== "performer" ||
          target.relationships[0].details.length !== 0
        ) {
          throw new Error("Backfilled Recording Personnel does not preserve legacy source");
        }
      }
    }
  },
});

export const run = migrations.runner();
export const runAll = migrations.runner([
  internal.migrations.backfillRecordingPersonnel,
  internal.migrations.verifyRecordingPersonnel,
]);
