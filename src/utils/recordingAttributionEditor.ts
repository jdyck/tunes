import type { Artist } from "../types/types.ts";
import type { Id } from "../../convex/_generated/dataModel.ts";
import type { RecordingAttributionInput } from "./musicbrainzRecordingAttribution.ts";

const creditedAsDefault = (part: RecordingAttributionInput, name: string) =>
  part.creditedAs.trim() && part.creditedAs !== part.name
    ? part.creditedAs
    : name;

export const addAttributionPart = (
  parts: readonly RecordingAttributionInput[],
  name = "",
): RecordingAttributionInput[] => [
  ...parts,
  {
    artistId: null,
    name,
    creditedAs: name,
    joinPhrase: "",
    kind: null,
    musicbrainzArtistId: null,
    providerUnmatchedConfirmed: false,
  },
];

export const changeManualArtistName = (
  part: RecordingAttributionInput,
  name: string,
): RecordingAttributionInput => ({
  ...part,
  artistId: null,
  name,
  creditedAs: creditedAsDefault(part, name),
  kind: null,
  musicbrainzArtistId: null,
  providerUnmatchedConfirmed: false,
});

export const selectExistingArtist = (
  part: RecordingAttributionInput,
  artist: Pick<Artist, "id" | "name" | "kind" | "musicbrainz_artist_id">,
): RecordingAttributionInput => ({
  ...part,
  artistId: artist.id as Id<"artists">,
  name: artist.name,
  creditedAs: creditedAsDefault(part, artist.name),
  kind: artist.kind ?? null,
  musicbrainzArtistId: artist.musicbrainz_artist_id ?? null,
  providerUnmatchedConfirmed: false,
});

export const confirmProviderUnmatchedArtist = (
  part: RecordingAttributionInput,
): RecordingAttributionInput => ({
  ...part,
  artistId: null,
  musicbrainzArtistId: null,
  providerUnmatchedConfirmed: true,
});

export const removeAttributionPart = (
  parts: readonly RecordingAttributionInput[],
  index: number,
): RecordingAttributionInput[] => parts.filter((_, current) => current !== index);

export const moveAttributionPart = (
  parts: readonly RecordingAttributionInput[],
  from: number,
  to: number,
): RecordingAttributionInput[] => {
  if (from === to || from < 0 || to < 0 || from >= parts.length || to >= parts.length) {
    return [...parts];
  }
  const next = [...parts];
  const [part] = next.splice(from, 1);
  next.splice(to, 0, part);
  return next;
};
