// src/utils/wikipedia.ts
//
// Server-only, same reasoning as musicbrainz.ts: Wikimedia's API etiquette
// asks for an identifying User-Agent, which browsers won't let client-side
// JS set.

const WIKIMEDIA_USER_AGENT =
  "tunes-personal-app/0.1 (https://github.com/jdyck/tunes)";

export interface WorkBackground {
  extract: string;
  url: string;
}

const fetchWikidataIdForWork = async (
  workId: string
): Promise<string | null> => {
  const url = new URL(`https://musicbrainz.org/ws/2/work/${workId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "url-rels");

  const response = await fetch(url, {
    headers: { "User-Agent": WIKIMEDIA_USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) return null;

  const data = await response.json();
  const relations: { type: string; url?: { resource: string } }[] =
    data.relations || [];
  const wikidataRelation = relations.find(
    (r) => r.type === "wikidata" && r.url
  );
  if (!wikidataRelation?.url) return null;

  const match = wikidataRelation.url.resource.match(/\/(Q\d+)$/);
  return match ? match[1] : null;
};

const fetchEnglishWikipediaTitle = async (
  wikidataId: string
): Promise<string | null> => {
  const response = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
    { headers: { "User-Agent": WIKIMEDIA_USER_AGENT, Accept: "application/json" } }
  );
  if (!response.ok) return null;

  const data = await response.json();
  const title = data.entities?.[wikidataId]?.sitelinks?.enwiki?.title;
  return title || null;
};

const fetchWikipediaSummary = async (
  title: string
): Promise<WorkBackground | null> => {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: { "User-Agent": WIKIMEDIA_USER_AGENT, Accept: "application/json" } }
  );
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.extract) return null;

  return {
    extract: data.extract,
    url:
      data.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
};

// Follows Wikidata -> Wikipedia to find a plain-language background summary,
// given a QID already known (e.g. pulled off a work's url-rels by the
// caller). Returns null at either missing hop.
export const fetchBackgroundForWikidataId = async (
  wikidataId: string
): Promise<WorkBackground | null> => {
  const enTitle = await fetchEnglishWikipediaTitle(wikidataId);
  if (!enTitle) return null;

  return fetchWikipediaSummary(enTitle);
};

// Follows work -> Wikidata -> Wikipedia to find a plain-language background
// summary. Returns null at any missing hop (most works aren't linked to
// Wikidata at all) rather than guessing or erroring.
export const fetchWorkBackground = async (
  workId: string
): Promise<WorkBackground | null> => {
  const wikidataId = await fetchWikidataIdForWork(workId);
  if (!wikidataId) return null;

  return fetchBackgroundForWikidataId(wikidataId);
};
