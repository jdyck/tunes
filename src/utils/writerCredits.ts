import type { SongArtistCreditInput } from "../types/types.ts";
import type { MusicBrainzSongArtistCredit } from "./musicbrainzArtistCredits.ts";

const normalizedName = (value: string | null | undefined): string =>
  value?.trim().toLocaleLowerCase("en-US") ?? "";

// Retain a loaded local Artist ID when a MusicBrainz refresh clearly refers
// to the same role/name. This lets the bounded RPC enrich that Artist with an
// MBID/kind instead of manufacturing a duplicate. A conflicting existing
// MBID is never reconciled by name alone.
export const writersFromMusicBrainz = (
  credits: MusicBrainzSongArtistCredit[],
  existing: SongArtistCreditInput[] = []
): SongArtistCreditInput[] => {
  const usedCreditIdentities = new Set<string>();

  return credits.map((credit) => {
    const match = existing.find((writer) => {
      const creditIdentity = `${writer.artistId}:${writer.role}`;
      if (!writer.artistId || usedCreditIdentities.has(creditIdentity)) {
        return false;
      }
      if (writer.role !== credit.role) return false;
      if (
        writer.musicbrainzArtistId &&
        writer.musicbrainzArtistId !== credit.musicbrainzArtistId
      ) {
        return false;
      }
      if (
        writer.musicbrainzArtistId &&
        writer.musicbrainzArtistId === credit.musicbrainzArtistId
      ) {
        return true;
      }

      const existingNames = new Set([
        normalizedName(writer.canonicalName),
        normalizedName(writer.creditedAs),
      ]);
      return (
        existingNames.has(normalizedName(credit.canonicalName)) ||
        existingNames.has(normalizedName(credit.creditedAs))
      );
    });

    if (match?.artistId) {
      usedCreditIdentities.add(`${match.artistId}:${match.role}`);
    }

    return {
      artistId: match?.artistId ?? null,
      canonicalName: credit.canonicalName,
      creditedAs: credit.creditedAs,
      role: credit.role,
      artistKind: credit.artistKind,
      musicbrainzArtistId: credit.musicbrainzArtistId,
    };
  });
};
