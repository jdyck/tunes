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
}

interface MusicBrainzWork {
  id: string;
  title: string;
  disambiguation?: string;
  relations?: MusicBrainzArtistRelation[];
}

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

  return works.map((work) => {
    const relations = work.relations || [];
    const namesForType = (type: string) =>
      relations.filter((r) => r.type === type && r.artist).map((r) => r.artist!.name);

    return {
      workId: work.id,
      title: work.title,
      disambiguation: work.disambiguation || null,
      composers: namesForType("composer"),
      lyricists: namesForType("lyricist"),
      writers: namesForType("writer"),
    };
  });
};

// Best-effort "year written": MusicBrainz works have no composition-date
// field, so this approximates it as the earliest dated relation on the
// work (first performance/recording) — close enough for songs written
// for a film or show and recorded soon after. Returns null rather than
// guessing when nothing is dated.
export const fetchSongWorkYear = async (
  workId: string
): Promise<string | null> => {
  const url = new URL(`https://musicbrainz.org/ws/2/work/${workId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "work-rels+artist-rels+recording-rels");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz work lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  const relations: { begin?: string }[] = data.relations || [];
  const years = relations
    .map((r) => r.begin?.match(/^\d{4}/)?.[0])
    .filter((year): year is string => Boolean(year));

  if (years.length === 0) return null;
  return years.sort()[0];
};
