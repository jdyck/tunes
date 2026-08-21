import type { RecordingAttributionPart } from "../types/types.ts";
import type { Id } from "../../convex/_generated/dataModel.ts";
import type { RecordingAttributionInput } from "./musicbrainzRecordingAttribution.ts";

export type RecordingAttributionPayload =
  | {
      type: "existing";
      artist_id: Id<"artists">;
      credited_as: string;
      join_phrase: string;
    }
  | {
      type: "musicbrainz";
      name: string;
      credited_as: string;
      join_phrase: string;
      kind: RecordingAttributionInput["kind"];
      musicbrainz_artist_id: string;
    }
  | {
      type: "provider_unmatched";
      name: string;
      credited_as: string;
      join_phrase: string;
      kind: RecordingAttributionInput["kind"];
    };

export const attributionCreditsToDraft = (
  credits: readonly RecordingAttributionPart[],
): RecordingAttributionInput[] =>
  credits.flatMap((credit) => {
    const artist = credit.artists;
    if (!artist) return [];
    return [{
      artistId: artist.id as Id<"artists">,
      musicbrainzArtistId: artist.musicbrainz_artist_id ?? null,
      providerUnmatchedConfirmed: false,
      name: artist.name,
      creditedAs: credit.credited_as,
      joinPhrase: credit.join_phrase,
      kind: artist.kind ?? null,
    }];
  });

export const attributionsToSavePayload = (
  attribution: readonly RecordingAttributionInput[],
): RecordingAttributionPayload[] =>
  attribution.map((part) => {
    if (part.artistId) {
      return {
        type: "existing",
        artist_id: part.artistId,
        credited_as: part.creditedAs,
        join_phrase: part.joinPhrase,
      };
    }
    if (part.musicbrainzArtistId) {
      return {
        type: "musicbrainz",
        name: part.name,
        credited_as: part.creditedAs,
        join_phrase: part.joinPhrase,
        kind: part.kind,
        musicbrainz_artist_id: part.musicbrainzArtistId,
      };
    }
    if (!part.providerUnmatchedConfirmed) {
      throw new Error("Select an existing Artist or create a provider-unmatched Artist");
    }
    return {
      type: "provider_unmatched",
      name: part.name,
      credited_as: part.creditedAs,
      join_phrase: part.joinPhrase,
      kind: part.kind,
    };
  });
