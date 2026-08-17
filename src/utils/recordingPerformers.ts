import type { RecordingPerformer } from "../lib/musicbrainz.ts";
import type {
  ArtistKind,
  RecordingArtistCredit,
} from "../types/types.ts";

export interface RecordingPerformerPayload {
  name: string;
  credited_as: string;
  kind: ArtistKind | null;
  musicbrainz_artist_id: string;
}

export const performerCreditsToDraft = (
  credits: readonly RecordingArtistCredit[]
): RecordingPerformer[] =>
  credits.flatMap((credit) => {
    const artist = credit.artists;
    const musicbrainzArtistId = artist?.musicbrainz_artist_id;
    if (!artist || !musicbrainzArtistId) return [];

    return [
      {
        musicbrainzArtistId,
        name: artist.name,
        creditedAs: credit.credited_as,
        kind: artist.kind ?? null,
      },
    ];
  });

export const performersToSavePayload = (
  performers: readonly RecordingPerformer[]
): RecordingPerformerPayload[] =>
  performers.map((performer) => ({
    name: performer.name,
    credited_as: performer.creditedAs,
    kind: performer.kind,
    musicbrainz_artist_id: performer.musicbrainzArtistId,
  }));
