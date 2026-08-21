import type { RecordingAttributionInput } from "./musicbrainzRecordingAttribution.ts";
import type { RecordingPersonnelEntry } from "./recordingPersonnel.ts";

export interface RecordingPersonnelRow {
  artistId: string | null;
  creditedAs: string;
  details: string[];
}

const relationshipOrder = {
  instrument: 0,
  vocal: 1,
  conductor: 2,
  orchestra: 3,
  performer: 4,
} as const;

const normalizedLabel = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const relationshipLabels = (
  relationship: RecordingPersonnelEntry["relationships"][number],
) => {
  if (relationship.type === "performer") return [];
  if (relationship.type === "conductor") return ["conductor"];
  if (relationship.type === "orchestra") return ["orchestra"];
  if (relationship.details.length === 0) {
    return [relationship.type === "instrument" ? "instrument" : "vocals"];
  }
  const labels = new Map<string, string>();
  for (const detail of relationship.details) {
    const label = detail.credited_as || detail.canonical;
    const key = normalizedLabel(label);
    if (!labels.has(key)) labels.set(key, label);
  }
  return [...labels.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
};

export const recordingPersonnelRows = (
  attribution: readonly RecordingAttributionInput[],
  personnel: readonly RecordingPersonnelEntry[],
): RecordingPersonnelRow[] => {
  const attributionOrder = new Map<string, number>();
  for (const [index, part] of attribution.entries()) {
    const identity = part.artistId
      ? `artist:${part.artistId}`
      : part.musicbrainzArtistId
        ? `musicbrainz:${part.musicbrainzArtistId}`
        : null;
    if (identity && !attributionOrder.has(identity)) {
      attributionOrder.set(identity, index);
    }
  }

  return personnel
    .map((entry, sourceOrder) => ({ entry, sourceOrder }))
    .sort((left, right) => {
      const leftIdentity = left.entry.artistId
        ? `artist:${left.entry.artistId}`
        : left.entry.musicbrainzArtistId
          ? `musicbrainz:${left.entry.musicbrainzArtistId}`
          : null;
      const rightIdentity = right.entry.artistId
        ? `artist:${right.entry.artistId}`
        : right.entry.musicbrainzArtistId
          ? `musicbrainz:${right.entry.musicbrainzArtistId}`
          : null;
      const leftOrder = leftIdentity
        ? attributionOrder.get(leftIdentity)
        : undefined;
      const rightOrder = rightIdentity
        ? attributionOrder.get(rightIdentity)
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
      details: [...entry.relationships]
        .sort(
          (left, right) =>
            relationshipOrder[left.type] - relationshipOrder[right.type],
        )
        .flatMap(relationshipLabels),
    }));
};
