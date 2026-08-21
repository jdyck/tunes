import type { RecordingAttributionPart } from "../types/types.ts";
import type { RecordingAttributionInput } from "./musicbrainzRecordingAttribution.ts";

export interface RecordingAttributionPayload {
  name: string;
  credited_as: string;
  join_phrase: string;
  kind: RecordingAttributionInput["kind"];
  musicbrainz_artist_id: string;
}

export const attributionCreditsToDraft = (
  credits: readonly RecordingAttributionPart[],
): RecordingAttributionInput[] =>
  credits.flatMap((credit) => {
    const artist = credit.artists;
    if (!artist?.musicbrainz_artist_id) return [];
    return [{
      musicbrainzArtistId: artist.musicbrainz_artist_id,
      name: artist.name,
      creditedAs: credit.credited_as,
      joinPhrase: credit.join_phrase,
      kind: artist.kind ?? null,
    }];
  });

export const attributionsToSavePayload = (
  attribution: readonly RecordingAttributionInput[],
): RecordingAttributionPayload[] =>
  attribution.map((part) => ({
    name: part.name,
    credited_as: part.creditedAs,
    join_phrase: part.joinPhrase,
    kind: part.kind,
    musicbrainz_artist_id: part.musicbrainzArtistId,
  }));
