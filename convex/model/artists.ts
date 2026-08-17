import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { artistKindValidator } from "./songs";

const nullableString = v.union(v.string(), v.null());

export const artistIdentityViewValidator = v.object({
  id: v.id("artists"),
  name: v.string(),
  kind: artistKindValidator,
  musicbrainz_artist_id: nullableString,
  wikidata_id: nullableString,
  image_url: nullableString,
  image_source_url: nullableString,
  image_license: nullableString,
  image_lookup_completed_at: nullableString,
});

export const artistSummaryViewValidator = v.object({
  id: v.id("artists"),
  name: v.string(),
  kind: artistKindValidator,
  songCount: v.number(),
  recordingCount: v.number(),
});

export const toArtistIdentityView = (artist: Doc<"artists">) => ({
  id: artist._id,
  name: artist.name,
  kind: artist.kind,
  musicbrainz_artist_id: artist.musicbrainzArtistId,
  wikidata_id: artist.wikidataId ?? null,
  image_url: artist.imageUrl ?? null,
  image_source_url: artist.imageSourceUrl ?? null,
  image_license: artist.imageLicense ?? null,
  image_lookup_completed_at: artist.imageLookupCompletedAt ?? null,
});
