// src/utils/musicbrainz.ts
//
// Server-only: MusicBrainz asks that requests carry an identifying
// User-Agent, which browsers won't let client-side JS set — so these
// functions are only ever called from Next.js route handlers, never
// directly from a component.

const USER_AGENT = "tunes-personal-app/0.1 (https://github.com/jdyck/tunes)";

export interface SongWorkSearchResult {
  workId: string;
  title: string;
  disambiguation: string | null;
  composers: string[];
  lyricists: string[];
  // Names credited as a generic "writer" when MusicBrainz doesn't split
  // the role into composer/lyricist (common for pop/rock songwriting
  // credits) — kept as its own role rather than guessed onto
  // composer/lyricist, since which part they wrote isn't known.
  writers: string[];
}

interface MusicBrainzArtistRelation {
  type: string;
  artist?: { name: string };
  begin?: string;
}

interface MusicBrainzUrlRelation {
  type: string;
  url?: { resource: string };
}

type MusicBrainzWorkRelation = MusicBrainzArtistRelation | MusicBrainzUrlRelation;

interface MusicBrainzWork {
  id: string;
  title: string;
  disambiguation?: string;
  relations?: MusicBrainzWorkRelation[];
}

// Extracts the Wikidata QID from a work's url-rels, if it has one --
// mirrors fetchWikidataIdForWork in wikipedia.ts, but reads off relations
// already fetched for this work instead of issuing a separate MusicBrainz
// lookup for the same data.
const wikidataIdFromRelations = (
  relations: MusicBrainzWorkRelation[]
): string | null => {
  const wikidataRelation = relations.find(
    (r): r is MusicBrainzUrlRelation => r.type === "wikidata" && "url" in r && !!r.url
  );
  if (!wikidataRelation?.url) return null;

  const match = wikidataRelation.url.resource.match(/\/(Q\d+)$/);
  return match ? match[1] : null;
};

const mapWorkToSearchResult = (work: MusicBrainzWork): SongWorkSearchResult => {
  const relations = work.relations || [];
  const artistRelations = relations.filter(
    (r): r is MusicBrainzArtistRelation => "artist" in r && !!r.artist
  );
  const namesForType = (type: string) =>
    artistRelations.filter((r) => r.type === type).map((r) => r.artist!.name);

  return {
    workId: work.id,
    title: work.title,
    disambiguation: work.disambiguation || null,
    composers: namesForType("composer"),
    lyricists: namesForType("lyricist"),
    writers: namesForType("writer"),
  };
};

// Best-effort "year written": MusicBrainz works have no composition-date
// field, so this approximates it as the earliest dated relation on the
// work (first performance/recording) — close enough for songs written
// for a film or show and recorded soon after. null when nothing is dated.
const earliestYear = (relations: MusicBrainzWorkRelation[]): string | null => {
  const years = relations
    .map((r) => ("begin" in r ? r.begin?.match(/^\d{4}/)?.[0] : undefined))
    .filter((year): year is string => Boolean(year));
  return years.length > 0 ? years.sort()[0] : null;
};

export const searchSongWorks = async (
  title: string
): Promise<SongWorkSearchResult[]> => {
  const url = new URL("https://musicbrainz.org/ws/2/work/");
  url.searchParams.set("query", title);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "15");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz search failed with status ${response.status}`);
  }

  const data = await response.json();
  const works: MusicBrainzWork[] = data.works || [];

  return works.map(mapWorkToSearchResult);
};

export interface SongWorkDetail extends SongWorkSearchResult {
  year: string | null;
  // Wikidata QID (e.g. "Q182311"), pulled off the same response's
  // url-rels so a Wikipedia background lookup (see wikipedia.ts) doesn't
  // need its own separate MusicBrainz round trip to find it.
  wikidataId: string | null;
}

// Looks up a single, already-known work by ID -- used to refresh a Song's
// writers/year/title from its linked MusicBrainz work, without re-searching
// by title. Also fetches url-rels so the Wikidata id comes back in the same
// request as year/writers, rather than a second MusicBrainz lookup.
export const fetchSongWork = async (
  workId: string
): Promise<SongWorkDetail | null> => {
  const url = new URL(`https://musicbrainz.org/ws/2/work/${workId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "work-rels+artist-rels+recording-rels+url-rels");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const work: MusicBrainzWork = data;
  const relations = work.relations || [];

  return {
    ...mapWorkToSearchResult(work),
    year: earliestYear(relations),
    wikidataId: wikidataIdFromRelations(relations),
  };
};

// Escapes Lucene's reserved characters so free-text values (song titles,
// artist names) can be safely embedded in a quoted field-scoped query term
// like `recording:"..."`.
const escapeLuceneValue = (value: string): string =>
  value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, "\\$1");

interface MusicBrainzRelease {
  title: string;
  date?: string;
}

interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  score?: number;
  "first-release-date"?: string;
  "artist-credit"?: { name: string }[];
  releases?: MusicBrainzRelease[];
}

// MusicBrainz's `length` is milliseconds; converts to the same "m:ss"
// format used elsewhere in the app (see formatYouTubeDuration).
const formatMsDuration = (ms: number | undefined): string | null => {
  if (!ms) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Best-effort "release year": takes the YYYY prefix of first-release-date,
// same "close enough" spirit as earliestYear() for Works -- MusicBrainz
// recordings have no separate composition-date field either.
const yearFromReleaseDate = (date: string | undefined): string | null =>
  date?.match(/^\d{4}/)?.[0] || null;

// Picks the release title matching first-release-date -- MusicBrainz's own
// computed earliest release across every release a Recording appears on --
// so the album shown is always the same release the year is drawn from,
// rather than two independently-chosen releases (e.g. an "official studio
// album" pick for the name landing on a different, later release than a
// separately-computed earliest year) that could show a mismatched pair.
// Falls back to the earliest release in this list by date when none
// matches exactly (first-release-date missing, or its release wasn't
// included in this particular response).
const pickAlbum = (
  releases: MusicBrainzRelease[] | undefined,
  firstReleaseDate: string | undefined
): string | null => {
  if (!releases || releases.length === 0) return null;

  const sorted = [...releases].sort((a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999")
  );

  const matching = firstReleaseDate
    ? sorted.find((release) => release.date === firstReleaseDate)
    : undefined;

  return (matching || sorted[0]).title;
};

export interface RecordingMatchResult {
  recordingId: string;
  title: string;
  artistCredit: string;
  album: string | null;
  year: string | null;
  duration: string | null;
  score: number;
}

const mapRecordingToMatchResult = (
  recording: MusicBrainzRecording
): RecordingMatchResult => ({
  recordingId: recording.id,
  title: recording.title,
  artistCredit: (recording["artist-credit"] || []).map((c) => c.name).join(" & "),
  album: pickAlbum(recording.releases, recording["first-release-date"]),
  year: yearFromReleaseDate(recording["first-release-date"]),
  duration: formatMsDuration(recording.length),
  score: recording.score || 0,
});

// Parses the app's "m:ss" duration format (see formatMsDuration /
// formatYouTubeDuration) into total seconds, for comparing against a known
// Recording duration. Tolerant of an "h:mm:ss" shape too, even though
// nothing in this app currently produces one.
const parseDurationToSeconds = (
  duration: string | null | undefined
): number | null => {
  if (!duration) return null;
  const parts = duration.split(":").map((part) => parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

// Reorders same-titled/same-artist candidates by closeness to a known
// duration. Necessary because MusicBrainz's relevance score maxes out at
// 100 as soon as title+artist match exactly -- a well-worn standard
// recorded across a dozen compilations/live albums by one artist comes
// back as a wall of 100-score ties with no meaningful order, so "the top
// result" is effectively arbitrary among them. Falls back to MusicBrainz's
// own order (score, then whatever it returns for further ties) when no
// duration hint is available to break ties with.
const rankByDuration = (
  results: RecordingMatchResult[],
  targetSeconds: number | null
): RecordingMatchResult[] => {
  if (targetSeconds == null) return results;

  return [...results].sort((a, b) => {
    const aSeconds = parseDurationToSeconds(a.duration);
    const bSeconds = parseDurationToSeconds(b.duration);
    if (aSeconds == null && bSeconds == null) return b.score - a.score;
    if (aSeconds == null) return 1;
    if (bSeconds == null) return -1;

    const aDiff = Math.abs(aSeconds - targetSeconds);
    const bDiff = Math.abs(bSeconds - targetSeconds);
    return aDiff !== bDiff ? aDiff - bDiff : b.score - a.score;
  });
};

// Searches MusicBrainz Recordings (a specific recorded performance --
// distinct from a Work, which is the underlying composition) by the Song's
// title and, when known, the Recording's credited artist. Used to power
// the add-recording auto-suggest match. `durationHint` -- the Recording's
// own duration, typically auto-filled from YouTube when it was added -- is
// used to pick the right release among same-titled/same-artist candidates;
// see rankByDuration.
export const searchRecordingMatches = async (
  songTitle: string,
  artist?: string | null,
  durationHint?: string | null
): Promise<RecordingMatchResult[]> => {
  let query = `recording:"${escapeLuceneValue(songTitle)}"`;
  if (artist) {
    query += ` AND artist:"${escapeLuceneValue(artist)}"`;
  }

  const url = new URL("https://musicbrainz.org/ws/2/recording/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "25");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz recording search failed with status ${response.status}`);
  }

  const data = await response.json();
  const recordings: MusicBrainzRecording[] = data.recordings || [];

  return rankByDuration(
    recordings.map(mapRecordingToMatchResult),
    parseDurationToSeconds(durationHint)
  );
};

// Looks up a single, already-known MusicBrainz Recording by ID -- used both
// to resolve a manually-picked search result and to power "Update from
// MusicBrainz" resync on an already-linked Recording.
export const fetchRecordingMatch = async (
  recordingId: string
): Promise<RecordingMatchResult | null> => {
  const url = new URL(`https://musicbrainz.org/ws/2/recording/${recordingId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "artist-credits+releases+work-rels");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return mapRecordingToMatchResult(data as MusicBrainzRecording);
};
