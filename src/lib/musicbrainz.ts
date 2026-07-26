// src/lib/musicbrainz.ts
//
// Server-only: MusicBrainz asks that requests carry an identifying
// User-Agent, which browsers won't let client-side JS set — so these
// functions are only ever called from Next.js route handlers, never
// directly from a component.

import { decodeHtmlEntities } from "../utils/htmlEntities.ts";
import { musicBrainzRecordingPerformers } from "../utils/musicbrainzPerformers.ts";
import type {
  MusicBrainzArtistRelation,
  MusicBrainzSongArtistCredit,
} from "../utils/musicbrainzArtistCredits.ts";
import { musicBrainzSongArtistCredits } from "../utils/musicbrainzArtistCredits.ts";
import { earliestMusicBrainzWriterYear } from "../utils/musicbrainzSongYear.ts";
import {
  parseMusicBrainzDateRange,
  rankRecordingCandidateEvidence,
  selectReleaseGroups,
  type RecordingCandidateEvidence,
  type ReleaseGroupEvidence,
} from "../utils/musicbrainzMatching.ts";
import {
  fetchMusicBrainzJson,
  isMusicBrainzNotFound,
} from "./musicbrainzTransport.ts";

const relationshipDateRange = (
  begin: string | null | undefined,
  end: string | null | undefined
) => parseMusicBrainzDateRange(begin, end === begin ? null : end);

export interface SongWorkSearchResult {
  workId: string;
  title: string;
  disambiguation: string | null;
  artistCredits: MusicBrainzSongArtistCredit[];
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

  return {
    workId: work.id,
    title: decodeHtmlEntities(work.title),
    disambiguation: work.disambiguation
      ? decodeHtmlEntities(work.disambiguation)
      : null,
    artistCredits: musicBrainzSongArtistCredits(artistRelations),
  };
};

export const searchSongWorks = async (
  title: string
): Promise<SongWorkSearchResult[]> => {
  const url = new URL("https://musicbrainz.org/ws/2/work/");
  url.searchParams.set("query", title);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "15");

  const data = await fetchMusicBrainzJson<{ works?: MusicBrainzWork[] }>(url);
  const works: MusicBrainzWork[] = data.works || [];

  return works.map(mapWorkToSearchResult);
};

export interface SongWorkDetail extends SongWorkSearchResult {
  year: string | null;
  workDateStart: string | null;
  workDateEnd: string | null;
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
  url.searchParams.set("inc", "artist-rels+work-rels+url-rels");

  let work: MusicBrainzWork;
  try {
    work = await fetchMusicBrainzJson<MusicBrainzWork>(url);
  } catch (error) {
    if (isMusicBrainzNotFound(error)) return null;
    throw error;
  }

  const relations = work.relations || [];
  const artistRelations = relations.filter(
    (relation): relation is MusicBrainzArtistRelation =>
      "artist" in relation && Boolean(relation.artist)
  );

  const authoredDates = artistRelations
    .filter((relation) => ["composer", "lyricist", "writer"].includes(relation.type))
    .map((relation) => relationshipDateRange(relation.begin, relation.end))
    .filter((date): date is NonNullable<typeof date> => date !== null)
    .sort((left, right) => left.start.value.localeCompare(right.start.value));

  return {
    ...mapWorkToSearchResult(work),
    year: earliestMusicBrainzWriterYear(artistRelations),
    workDateStart: authoredDates[0]?.start.value ?? null,
    workDateEnd: authoredDates[0]?.end?.value ?? null,
    wikidataId: wikidataIdFromRelations(relations),
  };
};

// Escapes Lucene's reserved characters so free-text values (song titles,
// artist names) can be safely embedded in a quoted field-scoped query term
// like `recording:"..."`.
const escapeLuceneValue = (value: string): string =>
  value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, "\\$1");

interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string | null;
  "secondary-types"?: string[];
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  status?: string;
  "release-group"?: MusicBrainzReleaseGroup;
  media?: {
    position?: number;
    tracks?: {
      position?: number;
      title: string;
      length?: number;
      recording?: { id: string; title: string; length?: number };
    }[];
  }[];
}

interface MusicBrainzRecordingRelation {
  type: string;
  begin?: string | null;
  end?: string | null;
  recording?: { id: string; title?: string; length?: number; disambiguation?: string };
  work?: { id: string };
  artist?: { id: string; name: string; type?: string | null };
  place?: { name: string; disambiguation?: string };
  attributes?: string[];
  "target-credit"?: string;
}

interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  score?: number;
  "first-release-date"?: string;
  "artist-credit"?: { name: string }[];
  releases?: MusicBrainzRelease[];
  relations?: MusicBrainzRecordingRelation[];
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

const normalizeForCompare = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\b(remaster(?:ed)?|version|mono|stereo|original mix|feat(?:uring)?\.?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the\s+/, "")
    .trim();

// Loose album-title match, used both to prefer a release in pickAlbum and
// as a ranking boost in rankCandidates -- never a filter, since the album a
// Recording arrived with (e.g. from YouTube) is often a differently-worded
// reissue or compilation title.
const albumMatches = (
  candidateAlbum: string | null,
  albumHint: string | null
): boolean => {
  if (!candidateAlbum || !albumHint) return false;
  const a = normalizeForCompare(candidateAlbum);
  const b = normalizeForCompare(albumHint);
  return a === b || a.includes(b) || b.includes(a);
};

export interface RecordingCandidate {
  recordingId: string;
  title: string;
  artistCredit: string;
  durationMs: number | null;
  workMatch: boolean | null;
  score: number;
  evidence: string[];
  releaseHint: string | null;
  releaseIdHint: string | null;
}

export interface RecordingCandidateSet {
  state: "clear" | "ambiguous" | "degraded";
  candidates: RecordingCandidate[];
  ambiguousCandidateIds: string[];
}

export interface RecordingPerformer {
  musicbrainzArtistId: string;
  name: string;
  creditedAs: string;
  kind: string | null;
}

export interface ResolvedRecordingMatch {
  recordingId: string;
  title: string;
  artistCredit: string;
  duration: string | null;
  recordingDateStart: string | null;
  recordingDateEnd: string | null;
  recordingLocation: string | null;
  performers: RecordingPerformer[];
  releaseGroup: { title: string; musicbrainzReleaseGroupId: string } | null;
  representativeReleaseId: string | null;
}

export interface ReleaseTracklistItem {
  recordingId: string;
  title: string;
  durationMs: number | null;
  mediumPosition: number;
  trackPosition: number;
}

export interface MusicBrainzReleaseSearchResult {
  releaseId: string;
  title: string;
  artistCredit: string;
  date: string | null;
  country: string | null;
  releaseGroupId: string | null;
}

export const searchMusicBrainzReleases = async (
  title: string,
  artist?: string | null
): Promise<MusicBrainzReleaseSearchResult[]> => {
  let query = `release:"${escapeLuceneValue(title)}"`;
  if (artist) query += ` AND artist:"${escapeLuceneValue(artist)}"`;
  const url = new URL("https://musicbrainz.org/ws/2/release/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "15");
  const data = await fetchMusicBrainzJson<{ releases?: (MusicBrainzRelease & {
    country?: string;
    "artist-credit"?: { name: string }[];
  })[] }>(url);
  return (data.releases ?? []).map((release) => ({
    releaseId: release.id,
    title: decodeHtmlEntities(release.title),
    artistCredit: (release["artist-credit"] ?? [])
      .map((credit) => decodeHtmlEntities(credit.name))
      .join(" & "),
    date: release.date ?? null,
    country: release.country ?? null,
    releaseGroupId: release["release-group"]?.id ?? null,
  }));
};

export const fetchReleaseTracklist = async (
  releaseId: string
): Promise<ReleaseTracklistItem[] | null> => {
  const url = new URL(`https://musicbrainz.org/ws/2/release/${releaseId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "recordings");
  try {
    const release = await fetchMusicBrainzJson<MusicBrainzRelease>(url);
    return (release.media ?? []).flatMap((medium, mediumIndex) =>
      (medium.tracks ?? [])
        .filter((track) => Boolean(track.recording?.id))
        .map((track, trackIndex) => ({
          recordingId: track.recording!.id,
          title: decodeHtmlEntities(track.recording!.title || track.title),
          durationMs: track.recording!.length ?? track.length ?? null,
          mediumPosition: medium.position ?? mediumIndex + 1,
          trackPosition: track.position ?? trackIndex + 1,
        }))
    );
  } catch (error) {
    if (isMusicBrainzNotFound(error)) return null;
    throw error;
  }
};

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

const artistMatches = (candidate: string, target: string | null): boolean => {
  if (!target) return true;
  const a = normalizeForCompare(candidate);
  const b = normalizeForCompare(target);
  return a === b || a.startsWith(b) || b.startsWith(a);
};

const releaseHint = (recording: MusicBrainzRecording, albumHint: string | null) => {
  const releases = recording.releases ?? [];
  return releases.find((release) => albumMatches(release.title, albumHint)) ?? releases[0] ?? null;
};

const fetchWorkRecordingIds = async (workId: string): Promise<Set<string>> => {
  const url = new URL(`https://musicbrainz.org/ws/2/work/${workId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "recording-rels");
  const work = await fetchMusicBrainzJson<{ relations?: MusicBrainzRecordingRelation[] }>(url);
  return new Set(
    (work.relations ?? [])
      .filter((relation) => relation.type === "performance" || relation.type === "recording of")
      .map((relation) => relation.recording?.id)
      .filter((id): id is string => Boolean(id))
  );
};

// Searches MusicBrainz Recordings (a specific recorded performance --
// distinct from a Work, which is the underlying composition) by the Song's
// title and, when known, the Recording's credited artist. Used to power
// the add-recording auto-suggest match. `durationHint` and `albumHint` --
// typically the Recording's own duration and album, auto-filled from
// YouTube when it was added -- rank same-titled/same-artist candidates;
// see rankCandidates. Pass `albumHint` as null/omitted when the known album
// looks like a compilation or reissue rather than trusted source data.
export const searchRecordingMatches = async (
  songTitle: string,
  artist?: string | null,
  durationHint?: string | null,
  albumHint?: string | null,
  workId?: string | null,
  albumYearHint?: string | null
): Promise<RecordingCandidateSet> => {
  let query = `recording:"${escapeLuceneValue(songTitle)}"`;
  if (artist) {
    query += ` AND artist:"${escapeLuceneValue(artist)}"`;
  }

  const url = new URL("https://musicbrainz.org/ws/2/recording/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "25");

  const data = await fetchMusicBrainzJson<{
    recordings?: MusicBrainzRecording[];
  }>(url);
  const recordings: MusicBrainzRecording[] = data.recordings || [];
  let workRecordingIds: Set<string> | null = null;
  if (workId) {
    try {
      workRecordingIds = await fetchWorkRecordingIds(workId);
    } catch {
      workRecordingIds = null;
    }
  }
  const titleTarget = normalizeForCompare(songTitle);
  const evidence: RecordingCandidateEvidence[] = recordings.map((recording) => {
    const credit = (recording["artist-credit"] ?? []).map((item) => decodeHtmlEntities(item.name)).join(" & ");
    const hint = releaseHint(recording, albumHint ?? null);
    return {
      recordingId: recording.id,
      titleMatch: normalizeForCompare(recording.title) === titleTarget,
      artistMatch: artistMatches(credit, artist ?? null),
      durationMs: recording.length ?? null,
      workMatch: workId ? workRecordingIds?.has(recording.id) ?? null : null,
      performanceDateStart: null,
      performanceDateEnd: null,
      relationshipAttributes: [],
      albumHintMatch: albumMatches(hint?.title ?? null, albumHint ?? null),
      albumYearMatch: albumYearHint
        ? hint?.date?.startsWith(albumYearHint) ?? false
        : null,
      score: recording.score ?? 0,
    };
  });
  const targetMs = parseDurationToSeconds(durationHint);
  const ranked = rankRecordingCandidateEvidence(
    evidence,
    targetMs === null ? null : targetMs * 1000
  );
  const byId = new Map(recordings.map((recording) => [recording.id, recording]));
  return {
    state: ranked.state,
    ambiguousCandidateIds: ranked.ambiguousCandidateIds,
    candidates: ranked.candidates.map((item) => {
      const recording = byId.get(item.recordingId)!;
      const hint = releaseHint(recording, albumHint ?? null);
      return {
        recordingId: recording.id,
        title: decodeHtmlEntities(recording.title),
        artistCredit: (recording["artist-credit"] ?? []).map((credit) => decodeHtmlEntities(credit.name)).join(" & "),
        durationMs: recording.length ?? null,
        workMatch: item.workMatch,
        score: item.score,
        evidence: [
          item.titleMatch ? "title" : null,
          item.artistMatch ? "artist" : null,
          item.albumHintMatch ? "pinned album" : null,
          item.workMatch === true ? "linked Work" : null,
        ].filter((value): value is string => value !== null),
        releaseHint: hint ? decodeHtmlEntities(hint.title) : null,
        releaseIdHint: hint?.id ?? null,
      };
    }),
  };
};

// Looks up a single, already-known MusicBrainz Recording by ID -- used both
// to resolve a manually-picked search result and to power "Update from
// MusicBrainz" resync on an already-linked Recording.
export const fetchRecordingMatch = async (
  recordingId: string,
  workId?: string | null
): Promise<ResolvedRecordingMatch | null> => {
  const url = new URL(`https://musicbrainz.org/ws/2/recording/${recordingId}`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set(
    "inc",
    "artist-credits+artist-rels+place-rels+releases+release-groups+work-rels"
  );

  try {
    const recording = await fetchMusicBrainzJson<MusicBrainzRecording>(url);
    const relations = recording.relations ?? [];
    const workRelations = relations.filter(
      (relation) =>
        Boolean(relation.work) &&
        (!workId || relation.work?.id === workId) &&
        (relation.type === "performance" || relation.type === "recording of")
    );
    const datedWorkRelation = workRelations
      .map((relation) => ({ relation, date: relationshipDateRange(relation.begin, relation.end) }))
      .filter((item): item is { relation: MusicBrainzRecordingRelation; date: NonNullable<typeof item.date> } => item.date !== null)
      .sort((left, right) => left.date.start.value.localeCompare(right.date.start.value))[0];
    const placeRelation = relations.find(
      (relation) => relation.place && ["recorded at", "recorded in"].includes(relation.type)
    );
    const performers = musicBrainzRecordingPerformers(relations);
    const groups = new Map<string, ReleaseGroupEvidence>();
    for (const release of recording.releases ?? []) {
      const group = release["release-group"];
      if (!group) continue;
      const current = groups.get(group.id) ?? {
        releaseGroupId: group.id,
        title: decodeHtmlEntities(group.title),
        primaryType: group["primary-type"] ?? null,
        secondaryTypes: group["secondary-types"] ?? [],
        containsRecording: true,
        albumHintMatch: false,
        releases: [],
      };
      current.releases.push({
        releaseId: release.id,
        date: release.date ?? null,
        status: release.status ?? null,
      });
      groups.set(group.id, current);
    }
    const selected = selectReleaseGroups([...groups.values()]);
    return {
      recordingId: recording.id,
      title: decodeHtmlEntities(recording.title),
      artistCredit: (recording["artist-credit"] ?? []).map((credit) => decodeHtmlEntities(credit.name)).join(" & "),
      duration: formatMsDuration(recording.length),
      recordingDateStart: datedWorkRelation?.date.start.value ?? null,
      recordingDateEnd: datedWorkRelation?.date.end?.value ?? null,
      recordingLocation: placeRelation?.place
        ? decodeHtmlEntities(
            [placeRelation.place.name, placeRelation.place.disambiguation].filter(Boolean).join(", ")
          )
        : null,
      performers,
      releaseGroup: selected.releaseGroupId && selected.title
        ? { title: selected.title, musicbrainzReleaseGroupId: selected.releaseGroupId }
        : null,
      representativeReleaseId: selected.representativeReleaseId,
    };
  } catch (error) {
    if (isMusicBrainzNotFound(error)) return null;
    throw error;
  }
};
