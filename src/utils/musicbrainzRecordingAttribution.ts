import type { ArtistKind } from "../types/types.ts";
import { decodeHtmlEntities } from "./htmlEntities.ts";
import { normalizeMusicBrainzArtistKind } from "./musicbrainzArtistCredits.ts";
import { formatRecordingAttribution } from "./recordingAttribution.ts";

export interface RecordingAttributionInput {
  musicbrainzArtistId: string;
  name: string;
  creditedAs: string;
  joinPhrase: string;
  kind: ArtistKind | null;
}

interface MusicBrainzRecordingArtistCredit {
  name?: string;
  joinphrase?: string;
  artist?: {
    id?: string;
    name?: string;
    type?: string | null;
  };
}

export const musicBrainzRecordingAttribution = (
  credits: readonly MusicBrainzRecordingArtistCredit[],
): RecordingAttributionInput[] =>
  credits.map((credit) => {
    const musicbrainzArtistId = credit.artist?.id?.trim();
    const canonicalName = credit.artist?.name;
    if (!musicbrainzArtistId || !canonicalName) {
      throw new Error(
        "A MusicBrainz Recording credit requires a canonical Artist identity",
      );
    }

    return {
      musicbrainzArtistId,
      name: decodeHtmlEntities(canonicalName),
      creditedAs: decodeHtmlEntities(credit.name ?? canonicalName),
      joinPhrase: decodeHtmlEntities(credit.joinphrase ?? ""),
      kind: normalizeMusicBrainzArtistKind(credit.artist?.type),
    };
  });

export const formatMusicBrainzRecordingCredit = (
  credits: readonly MusicBrainzRecordingArtistCredit[],
): string =>
  formatRecordingAttribution(
    credits.map((credit, sortOrder) => ({
      credited_as: decodeHtmlEntities(credit.name ?? credit.artist?.name ?? ""),
      join_phrase: decodeHtmlEntities(credit.joinphrase ?? ""),
      sort_order: sortOrder,
    })),
  ) ?? "";
