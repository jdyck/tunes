import type { ArtistMembership } from "../types/artistMembership.ts";
import { decodeHtmlEntities } from "./htmlEntities.ts";
import { parseMusicBrainzDate } from "./musicbrainzMatching.ts";

const MEMBER_OF_BAND_ID = "5be4c609-9afa-4ea0-910b-12ffb71e3821";
const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export const isArtistMembershipCacheFresh = (
  fetchedAt: string | null,
  now = Date.now(),
): boolean => {
  if (!fetchedAt) return false;
  const age = now - Date.parse(fetchedAt);
  return age >= 0 && age < CACHE_MAX_AGE_MS;
};

export const validateArtistMemberships = (items: ArtistMembership[]): void => {
  // Bound both database fan-out and the size of this provider snapshot.
  if (items.length > 500)
    throw new Error("Artist membership exceeds 500 entries");
  if (new TextEncoder().encode(JSON.stringify(items)).length > 256 * 1024) {
    throw new Error("Artist membership snapshot is too large");
  }
  for (const item of items) {
    if (!MBID.test(item.musicbrainz_artist_id) || !item.name.trim()) {
      throw new Error("Invalid membership Artist identity");
    }
    if (
      item.name.length > 1_000 ||
      item.attributes.length > 50 ||
      item.attributes.some((value) => !value.trim() || value.length > 1_000)
    ) {
      throw new Error("Invalid membership description");
    }
    for (const date of [item.begin, item.end]) {
      if (date !== null && !parseMusicBrainzDate(date)) {
        throw new Error("Invalid membership date");
      }
    }
  }
};

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Malformed MusicBrainz membership response");
  }
  return value as Record<string, unknown>;
};

const optionalDate = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !parseMusicBrainzDate(value)) {
    throw new Error("Invalid membership date");
  }
  return value;
};

export const musicBrainzArtistMemberships = (
  data: unknown,
): ArtistMembership[] => {
  const response = object(data);
  if (!Array.isArray(response.relations)) {
    throw new Error("Missing MusicBrainz Artist relationships");
  }
  const items: ArtistMembership[] = [];
  for (const value of response.relations) {
    const relation = object(value);
    // Match the stable relationship ID, not a translated name or an Artist kind.
    if (relation["type-id"] !== MEMBER_OF_BAND_ID) continue;
    if (relation.direction !== "forward" && relation.direction !== "backward") {
      throw new Error("Missing membership direction");
    }
    const artist = object(relation.artist);
    if (typeof artist.id !== "string" || typeof artist.name !== "string") {
      throw new Error("Invalid membership Artist identity");
    }
    const attributes = relation.attributes ?? [];
    if (
      !Array.isArray(attributes) ||
      attributes.some((attr) => typeof attr !== "string")
    ) {
      throw new Error("Invalid membership attributes");
    }
    const credits = object(relation["attribute-credits"] ?? {});
    const values = object(relation["attribute-values"] ?? {});
    const end = optionalDate(relation.end);
    items.push({
      musicbrainz_artist_id: artist.id.toLowerCase(),
      name: decodeHtmlEntities(artist.name).trim(),
      relationship: relation.direction === "backward" ? "member" : "group",
      begin: optionalDate(relation.begin),
      end,
      ended: relation.ended === true || end !== null,
      attributes: attributes.map((attribute: string) => {
        const label = credits[attribute] || values[attribute] || attribute;
        if (typeof label !== "string")
          throw new Error("Invalid membership attribute");
        return decodeHtmlEntities(label).trim();
      }),
    });
  }
  validateArtistMemberships(items);
  // Separate stints remain separate: joining, leaving, and rejoining is meaningful.
  return items.sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      (a.begin ?? "").localeCompare(b.begin ?? "") ||
      (a.end ?? "").localeCompare(b.end ?? ""),
  );
};

export const formatArtistMembershipDetails = (
  item: ArtistMembership,
): string => {
  let dates = "";
  if (item.begin && item.end)
    dates = item.begin === item.end ? item.begin : `${item.begin}–${item.end}`;
  else if (item.begin)
    dates = item.ended ? `${item.begin}–?` : `From ${item.begin}`;
  else if (item.end) dates = `Until ${item.end}`;
  // A missing end date is not evidence of current membership.
  if (item.ended && !item.end)
    dates = [dates, "Former member"].filter(Boolean).join(" · ");
  return [...item.attributes, dates].filter(Boolean).join(" · ");
};
