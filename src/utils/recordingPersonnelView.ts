import type { RecordingAttributionInput } from "./musicbrainzRecordingAttribution.ts";
import type { RecordingPersonnelEntry } from "./recordingPersonnel.ts";

export interface RecordingPersonnelRow {
  artistId: string | null;
  creditedAs: string;
  details: string[];
}

export const recordingPersonnelRows = (
  attribution: readonly RecordingAttributionInput[],
  personnel: readonly RecordingPersonnelEntry[],
): RecordingPersonnelRow[] => {
  const attributionOrder = new Map<string, number>();
  for (const [index, part] of attribution.entries()) {
    if (part.artistId && !attributionOrder.has(part.artistId)) {
      attributionOrder.set(part.artistId, index);
    }
  }

  return personnel
    .map((entry, sourceOrder) => ({ entry, sourceOrder }))
    .sort((left, right) => {
      const leftOrder = left.entry.artistId
        ? attributionOrder.get(left.entry.artistId)
        : undefined;
      const rightOrder = right.entry.artistId
        ? attributionOrder.get(right.entry.artistId)
        : undefined;
      if (leftOrder !== undefined || rightOrder !== undefined) {
        if (leftOrder === undefined) return 1;
        if (rightOrder === undefined) return -1;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      }
      const byName = left.entry.name.localeCompare(right.entry.name, undefined, {
        sensitivity: "base",
      });
      return byName || left.sourceOrder - right.sourceOrder;
    })
    .map(({ entry }) => ({
      artistId: entry.artistId,
      creditedAs: entry.creditedAs,
      details: entry.relationships.flatMap((relationship) =>
        relationship.type === "performer" ? [] : [relationship.type],
      ),
    }));
};
