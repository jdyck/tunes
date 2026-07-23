import type { ArtistKind, SongArtistCreditRole } from "../types/types.ts";
import { decodeHtmlEntities } from "./htmlEntities.ts";

export interface MusicBrainzArtistRelation {
  type: string;
  artist?: {
    id?: string;
    name: string;
    type?: string | null;
  };
  "target-credit"?: string;
  begin?: string;
}

export interface MusicBrainzSongArtistCredit {
  musicbrainzArtistId: string | null;
  canonicalName: string;
  creditedAs: string;
  artistKind: ArtistKind | null;
  role: SongArtistCreditRole;
}

const SONG_CREDIT_ROLES = new Set<SongArtistCreditRole>([
  "composer",
  "lyricist",
  "writer",
]);

const ARTIST_KINDS = new Set<ArtistKind>([
  "person",
  "group",
  "orchestra",
  "choir",
  "character",
  "other",
]);

export const normalizeMusicBrainzArtistKind = (
  value: string | null | undefined
): ArtistKind | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized && ARTIST_KINDS.has(normalized as ArtistKind)
    ? (normalized as ArtistKind)
    : null;
};

export const musicBrainzSongArtistCredits = (
  relations: MusicBrainzArtistRelation[]
): MusicBrainzSongArtistCredit[] =>
  relations.flatMap((relation) => {
    if (
      !relation.artist ||
      !SONG_CREDIT_ROLES.has(relation.type as SongArtistCreditRole)
    ) {
      return [];
    }

    const canonicalName = decodeHtmlEntities(relation.artist.name).trim();
    if (!canonicalName) return [];

    const creditedAs = decodeHtmlEntities(
      relation["target-credit"] || relation.artist.name
    ).trim();

    return [
      {
        musicbrainzArtistId: relation.artist.id || null,
        canonicalName,
        creditedAs: creditedAs || canonicalName,
        artistKind: normalizeMusicBrainzArtistKind(relation.artist.type),
        role: relation.type as SongArtistCreditRole,
      },
    ];
  });
