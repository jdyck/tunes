import type {
  ArtistKind,
  RecordingPersonnelEntry as SavedRecordingPersonnelEntry,
  RecordingPersonnelRelationship,
} from "../types/types.ts";
import type { Id } from "../../convex/_generated/dataModel.ts";

export interface RecordingPersonnelEntry {
  artistId: Id<"artists"> | null;
  musicbrainzArtistId: string | null;
  name: string;
  creditedAs: string;
  kind: ArtistKind | null;
  relationships: RecordingPersonnelRelationship[];
}

export type RecordingPersonnelPayload =
  | {
      type: "existing";
      artist_id: Id<"artists">;
      credited_as: string;
      relationships: RecordingPersonnelRelationship[];
    }
  | {
      type: "musicbrainz";
      name: string;
      credited_as: string;
      kind: ArtistKind | null;
      musicbrainz_artist_id: string;
      relationships: RecordingPersonnelRelationship[];
    };

export const personnelEntriesToDraft = (
  entries: readonly SavedRecordingPersonnelEntry[],
): RecordingPersonnelEntry[] =>
  entries.flatMap((entry) => {
    const artist = entry.artists;
    if (!artist) return [];
    return [
      {
        artistId: entry.artist_id as Id<"artists">,
        musicbrainzArtistId: artist.musicbrainz_artist_id ?? null,
        name: artist.name,
        creditedAs: entry.credited_as,
        kind: artist.kind ?? null,
        relationships: entry.relationships,
      },
    ];
  });

export const personnelEntriesToSavePayload = (
  entries: readonly RecordingPersonnelEntry[],
): RecordingPersonnelPayload[] =>
  entries.map((entry) => {
    const common = {
      credited_as: entry.creditedAs,
      relationships: entry.relationships,
    };
    if (entry.artistId) {
      return { type: "existing" as const, artist_id: entry.artistId, ...common };
    }
    if (!entry.musicbrainzArtistId) {
      throw new Error("Recording Personnel requires an Artist identity");
    }
    return {
      type: "musicbrainz" as const,
      name: entry.name,
      kind: entry.kind,
      musicbrainz_artist_id: entry.musicbrainzArtistId,
      ...common,
    };
  });
