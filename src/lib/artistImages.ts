import {
  fetchMusicBrainzJson,
  isMusicBrainzNotFound,
} from "./musicbrainzTransport.ts";

const WIKIMEDIA_USER_AGENT =
  "Standards/0.1.0 (https://github.com/jdyck/tunes)";

export interface ArtistImageMetadata {
  wikidataId: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  license: string | null;
}

interface WikidataImageClaim {
  rank?: "preferred" | "normal" | "deprecated";
  mainsnak?: { datavalue?: { value?: string } };
}

export const selectWikidataImageFile = (
  claims: WikidataImageClaim[] | undefined
): string | null => {
  const usable = (claims ?? []).filter(
    (claim) =>
      claim.rank !== "deprecated" &&
      typeof claim.mainsnak?.datavalue?.value === "string"
  );
  const selected = usable.find((claim) => claim.rank === "preferred") ?? usable[0];
  return selected?.mainsnak?.datavalue?.value ?? null;
};

const wikidataIdForArtist = async (musicbrainzArtistId: string) => {
  const url = new URL(`https://musicbrainz.org/ws/2/artist/${musicbrainzArtistId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "url-rels");

  let data: { relations?: { type: string; url?: { resource: string } }[] };
  try {
    data = await fetchMusicBrainzJson(url);
  } catch (error) {
    if (isMusicBrainzNotFound(error)) return null;
    throw error;
  }

  const relation = (data.relations ?? []).find(
    (candidate) => candidate.type === "wikidata" && candidate.url
  );
  return relation?.url?.resource.match(/\/(Q\d+)$/)?.[1] ?? null;
};

const commonsImageMetadata = async (fileName: string) => {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("titles", `File:${fileName}`);

  const response = await fetch(url, {
    headers: { "User-Agent": WIKIMEDIA_USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Commons responded with ${response.status}`);

  const data = (await response.json()) as {
    query?: { pages?: Record<string, { imageinfo?: {
      url?: string;
      descriptionurl?: string;
      extmetadata?: { LicenseShortName?: { value?: string } };
    }[] }> };
  };
  const info = Object.values(data.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.url || !info.descriptionurl) return null;
  return {
    imageUrl: info.url,
    sourceUrl: info.descriptionurl,
    license: info.extmetadata?.LicenseShortName?.value ?? null,
  };
};

export const fetchArtistImageMetadata = async (
  musicbrainzArtistId: string
): Promise<ArtistImageMetadata> => {
  const wikidataId = await wikidataIdForArtist(musicbrainzArtistId);
  if (!wikidataId) {
    return { wikidataId: null, imageUrl: null, sourceUrl: null, license: null };
  }

  const response = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
    { headers: { "User-Agent": WIKIMEDIA_USER_AGENT, Accept: "application/json" } }
  );
  if (!response.ok) throw new Error(`Wikidata responded with ${response.status}`);

  const data = (await response.json()) as {
    entities?: Record<string, { claims?: { P18?: WikidataImageClaim[] } }>;
  };
  const fileName = selectWikidataImageFile(data.entities?.[wikidataId]?.claims?.P18);
  if (!fileName) {
    return { wikidataId, imageUrl: null, sourceUrl: null, license: null };
  }

  const image = await commonsImageMetadata(fileName);
  return {
    wikidataId,
    imageUrl: image?.imageUrl ?? null,
    sourceUrl: image?.sourceUrl ?? null,
    license: image?.license ?? null,
  };
};
