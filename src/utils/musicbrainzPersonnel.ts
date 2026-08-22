import { decodeHtmlEntities } from "./htmlEntities.ts";
import { normalizeMusicBrainzArtistKind } from "./musicbrainzArtistCredits.ts";
import {
  normalizePersonnelText,
  type RecordingPersonnelDraftEntry,
} from "./recordingPersonnel.ts";
import type { RecordingPersonnelDetail } from "../types/types.ts";
import type { RecordingPersonnelRelationshipType } from "../types/types.ts";

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

const relationshipDetails = (
  relation: MusicBrainzPersonnelRelation,
): RecordingPersonnelDetail[] => {
  const details: RecordingPersonnelDetail[] = [];
  for (const attribute of relation.attributes ?? []) {
    if (unsupportedQualifiers.has(normalizePersonnelText(attribute))) continue;
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
  `${normalizePersonnelText(detail.canonical)}\u0000${
    detail.credited_as ? normalizePersonnelText(detail.credited_as) : ""
  }`;

export const musicBrainzRecordingPersonnel = (
  relations: readonly MusicBrainzPersonnelRelation[],
): RecordingPersonnelDraftEntry[] => {
  const personnelByArtist = new Map<
    string,
    RecordingPersonnelDraftEntry & {
      detailsByType: Record<
        "instrument" | "vocal",
        Map<string, RecordingPersonnelDetail>
      >;
      relationshipTypes: Set<RecordingPersonnelRelationshipType>;
    }
  >();

  for (const relation of relations) {
    if (
      !["instrument", "vocal", "performer", "conductor", "orchestra"].includes(
        relation.type,
      )
    ) {
      continue;
    }
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
      detailsByType: { instrument: new Map(), vocal: new Map() },
      relationshipTypes: new Set(),
    };
    personnelByArtist.set(artistId, entry);

    const relationshipType =
      relation.type as RecordingPersonnelRelationshipType;
    entry.relationshipTypes.add(relationshipType);
    if (relationshipType !== "instrument" && relationshipType !== "vocal") {
      continue;
    }
    const details = entry.detailsByType[relationshipType];
    for (const detail of relationshipDetails(relation)) {
      const key = detailKey(detail);
      if (!details.has(key)) {
        details.set(key, detail);
      }
    }
  }

  const specificOrder = [
    "instrument",
    "vocal",
    "conductor",
    "orchestra",
  ] as const;
  return [...personnelByArtist.values()].map((value) => {
    const { detailsByType, relationshipTypes, ...entry } = value;
    const relationships = specificOrder.flatMap((type) => {
      if (!relationshipTypes.has(type)) return [];
      return [
        {
          type,
          details:
            type === "instrument" || type === "vocal"
              ? [...detailsByType[type].values()]
              : [],
        },
      ];
    });
    return {
      ...entry,
      relationships:
        relationships.length > 0
          ? relationships
          : relationshipTypes.has("performer")
            ? [{ type: "performer" as const, details: [] }]
            : [],
    };
  });
};
