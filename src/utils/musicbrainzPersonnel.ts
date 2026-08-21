import { decodeHtmlEntities } from "./htmlEntities.ts";
import { normalizeMusicBrainzArtistKind } from "./musicbrainzArtistCredits.ts";
import type { RecordingPersonnelEntry } from "./recordingPersonnel.ts";
import type { RecordingPersonnelDetail } from "../types/types.ts";

export interface MusicBrainzPersonnelRelation {
  type: string;
  artist?: { id: string; name: string; type?: string | null };
  attributes?: string[];
  "attribute-values"?: Record<string, string>;
  "attribute-credits"?: Record<string, string>;
  "target-credit"?: string;
  begin?: string | null;
  end?: string | null;
}

const unsupportedQualifiers = new Set([
  "guest",
  "solo",
  "additional",
  "assistant",
]);

const normalizedText = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const instrumentDetails = (
  relation: MusicBrainzPersonnelRelation,
): RecordingPersonnelDetail[] => {
  const details: RecordingPersonnelDetail[] = [];
  for (const attribute of relation.attributes ?? []) {
    if (unsupportedQualifiers.has(normalizedText(attribute))) continue;
    const canonical = decodeHtmlEntities(
      relation["attribute-values"]?.[attribute] ?? attribute,
    ).trim();
    if (!canonical) continue;
    const creditedAs = relation["attribute-credits"]?.[attribute];
    details.push({
      canonical,
      credited_as: creditedAs ? decodeHtmlEntities(creditedAs).trim() : null,
    });
  }
  return details;
};

const detailKey = (detail: RecordingPersonnelDetail) =>
  `${normalizedText(detail.canonical)}\u0000${
    detail.credited_as ? normalizedText(detail.credited_as) : ""
  }`;

export const musicBrainzRecordingPersonnel = (
  relations: readonly MusicBrainzPersonnelRelation[],
): RecordingPersonnelEntry[] => {
  const personnelByArtist = new Map<
    string,
    RecordingPersonnelEntry & {
      instrumentDetails: Map<string, RecordingPersonnelDetail>;
      hasInstrument: boolean;
      hasPerformer: boolean;
    }
  >();

  for (const relation of relations) {
    if (!["instrument", "performer"].includes(relation.type)) continue;
    const artistId = relation.artist?.id.trim();
    const artistName = relation.artist?.name.trim();
    if (!artistId || !artistName) continue;

    const entry = personnelByArtist.get(artistId) ?? {
      artistId: null,
      musicbrainzArtistId: artistId,
      name: decodeHtmlEntities(artistName),
      creditedAs: decodeHtmlEntities(
        relation["target-credit"]?.trim() || artistName,
      ),
      kind: normalizeMusicBrainzArtistKind(relation.artist?.type),
      relationships: [],
      instrumentDetails: new Map(),
      hasInstrument: false,
      hasPerformer: false,
    };
    personnelByArtist.set(artistId, entry);

    if (relation.type === "performer") {
      entry.hasPerformer = true;
      continue;
    }
    entry.hasInstrument = true;
    for (const detail of instrumentDetails(relation)) {
      const key = detailKey(detail);
      if (!entry.instrumentDetails.has(key)) {
        entry.instrumentDetails.set(key, detail);
      }
    }
  }

  return [...personnelByArtist.values()].map(
    ({ instrumentDetails: details, hasInstrument, hasPerformer, ...entry }) => ({
      ...entry,
      relationships: hasInstrument
        ? [{ type: "instrument" as const, details: [...details.values()] }]
        : hasPerformer
          ? [{ type: "performer" as const, details: [] }]
          : [],
    }),
  );
};
