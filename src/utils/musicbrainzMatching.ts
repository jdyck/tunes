export interface MusicBrainzPartialDate {
  value: string;
  precision: "year" | "month" | "day";
  year: number;
  month: number | null;
  day: number | null;
}

export interface MusicBrainzDateRange {
  start: MusicBrainzPartialDate;
  end: MusicBrainzPartialDate | null;
}

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

export const parseMusicBrainzDate = (
  value: string | null | undefined
): MusicBrainzPartialDate | null => {
  if (!value) return null;

  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;
  if (year === 0 || (month !== null && (month < 1 || month > 12))) return null;

  if (day !== null) {
    if (month === null) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
  }

  return {
    value,
    precision: day !== null ? "day" : month !== null ? "month" : "year",
    year,
    month,
    day,
  };
};

const dateLowerBound = (date: MusicBrainzPartialDate): number =>
  date.year * 10_000 + (date.month ?? 1) * 100 + (date.day ?? 1);

const dateUpperBound = (date: MusicBrainzPartialDate): number => {
  const month = date.month ?? 12;
  const day = date.day ?? daysInMonth(date.year, month);
  return date.year * 10_000 + month * 100 + day;
};

export const parseMusicBrainzDateRange = (
  startValue: string | null | undefined,
  endValue?: string | null
): MusicBrainzDateRange | null => {
  const start = parseMusicBrainzDate(startValue);
  const end = parseMusicBrainzDate(endValue);
  if (!start || (endValue && !end)) return null;
  if (end && dateLowerBound(start) > dateUpperBound(end)) return null;
  return { start, end };
};

export interface RecordingCandidateEvidence {
  recordingId: string;
  titleMatch: boolean;
  artistMatch: boolean;
  durationMs: number | null;
  workMatch: boolean | null;
  performanceDateStart: string | null;
  performanceDateEnd: string | null;
  relationshipAttributes: string[];
  albumHintMatch: boolean;
  score: number;
}

export interface RankedRecordingCandidates {
  state: "clear" | "ambiguous" | "degraded";
  candidates: RecordingCandidateEvidence[];
  ambiguousCandidateIds: string[];
}

export const MUSICBRAINZ_DURATION_TOLERANCE_MS = 3_000;

const booleanRank = (value: boolean): number => (value ? 1 : 0);
const workMatchRank = (value: boolean | null): number =>
  value === true ? 2 : value === null ? 1 : 0;

const durationDifference = (
  durationMs: number | null,
  targetDurationMs: number | null
): number | null =>
  durationMs === null || targetDurationMs === null
    ? null
    : Math.abs(durationMs - targetDurationMs);

const compareCandidateEvidence = (
  left: RecordingCandidateEvidence,
  right: RecordingCandidateEvidence,
  targetDurationMs: number | null
): number => {
  const rankedChecks = [
    workMatchRank(right.workMatch) - workMatchRank(left.workMatch),
    booleanRank(right.titleMatch) - booleanRank(left.titleMatch),
    booleanRank(right.artistMatch) - booleanRank(left.artistMatch),
  ];
  const rankedDifference = rankedChecks.find((difference) => difference !== 0);
  if (rankedDifference !== undefined) return rankedDifference;

  const leftDuration = durationDifference(left.durationMs, targetDurationMs);
  const rightDuration = durationDifference(right.durationMs, targetDurationMs);
  if (leftDuration === null && rightDuration !== null) return 1;
  if (rightDuration === null && leftDuration !== null) return -1;
  if (
    leftDuration !== null &&
    rightDuration !== null &&
    Math.abs(leftDuration - rightDuration) > MUSICBRAINZ_DURATION_TOLERANCE_MS
  ) {
    return leftDuration - rightDuration;
  }

  const dateDifference =
    booleanRank(Boolean(right.performanceDateStart)) -
    booleanRank(Boolean(left.performanceDateStart));
  if (dateDifference !== 0) return dateDifference;

  const albumDifference =
    booleanRank(right.albumHintMatch) - booleanRank(left.albumHintMatch);
  if (albumDifference !== 0) return albumDifference;

  return right.score - left.score;
};

const normalizedAttributes = (attributes: string[]): string =>
  [...new Set(attributes.map((attribute) => attribute.toLowerCase()))]
    .sort()
    .join("|");

const candidatesAreAmbiguous = (
  left: RecordingCandidateEvidence,
  right: RecordingCandidateEvidence
): boolean =>
  left.workMatch === true &&
  right.workMatch === true &&
  left.titleMatch &&
  right.titleMatch &&
  left.artistMatch &&
  right.artistMatch &&
  (left.durationMs === null ||
    right.durationMs === null ||
    Math.abs(left.durationMs - right.durationMs) <=
      MUSICBRAINZ_DURATION_TOLERANCE_MS) &&
  left.performanceDateStart === right.performanceDateStart &&
  left.performanceDateEnd === right.performanceDateEnd &&
  normalizedAttributes(left.relationshipAttributes) ===
    normalizedAttributes(right.relationshipAttributes);

export const rankRecordingCandidateEvidence = (
  candidates: RecordingCandidateEvidence[],
  targetDurationMs: number | null
): RankedRecordingCandidates => {
  const ranked = [...candidates].sort((left, right) =>
    compareCandidateEvidence(left, right, targetDurationMs)
  );
  const leadingCandidate = ranked.find((candidate) => candidate.workMatch === true);
  const ambiguousCandidateIds = leadingCandidate
    ? ranked
        .filter((candidate) => candidatesAreAmbiguous(leadingCandidate, candidate))
        .map((candidate) => candidate.recordingId)
    : [];

  return {
    state:
      candidates.length > 0 && candidates.every((candidate) => candidate.workMatch === null)
        ? "degraded"
        : ambiguousCandidateIds.length > 1
          ? "ambiguous"
          : "clear",
    candidates: ranked,
    ambiguousCandidateIds,
  };
};

export interface ReleaseEditionEvidence {
  releaseId: string;
  date: string | null;
  status: string | null;
}

export interface ReleaseGroupEvidence {
  releaseGroupId: string;
  title: string;
  primaryType: string | null;
  secondaryTypes: string[];
  containsRecording: boolean;
  albumHintMatch: boolean;
  releases: ReleaseEditionEvidence[];
}

export interface ReleaseGroupSelection {
  originalReleaseGroupId: string | null;
  primaryReleaseGroupId: string | null;
  representativeReleaseId: string | null;
  originalAmbiguous: boolean;
  primaryAmbiguous: boolean;
}

const isOfficial = (release: ReleaseEditionEvidence): boolean =>
  release.status?.toLowerCase() === "official";

const earliestDatedRelease = (
  releases: ReleaseEditionEvidence[]
): ReleaseEditionEvidence | null =>
  releases
    .map((release) => ({ release, date: parseMusicBrainzDate(release.date) }))
    .filter(
      (item): item is { release: ReleaseEditionEvidence; date: MusicBrainzPartialDate } =>
        item.date !== null
    )
    .sort(
      (left, right) =>
        dateLowerBound(left.date) - dateLowerBound(right.date) ||
        left.release.releaseId.localeCompare(right.release.releaseId)
    )[0]?.release ?? null;

const representativeRelease = (
  group: ReleaseGroupEvidence | null
): ReleaseEditionEvidence | null => {
  if (!group) return null;
  const official = group.releases.filter(isOfficial);
  const pool = official.length > 0 ? official : group.releases;
  return (
    earliestDatedRelease(pool) ??
    [...pool].sort((left, right) => left.releaseId.localeCompare(right.releaseId))[0] ??
    null
  );
};

const primaryTypeRank = (group: ReleaseGroupEvidence): number => {
  const type = group.primaryType?.toLowerCase();
  return type === "album" ? 2 : type === "ep" ? 1 : 0;
};

const isEligiblePrimaryGroup = (group: ReleaseGroupEvidence): boolean => {
  const secondaryTypes = group.secondaryTypes.map((type) => type.toLowerCase());
  return (
    group.containsRecording &&
    !secondaryTypes.includes("compilation") &&
    !secondaryTypes.includes("remix") &&
    primaryTypeRank(group) > 0
  );
};

export const selectReleaseGroups = (
  groups: ReleaseGroupEvidence[]
): ReleaseGroupSelection => {
  const containingGroups = groups.filter((group) => group.containsRecording);
  const groupsWithUndatedOfficialReleases = containingGroups.filter((group) => {
    const officialReleases = group.releases.filter(isOfficial);
    return officialReleases.length > 0 && !earliestDatedRelease(officialReleases);
  });
  const originalCandidates = containingGroups
    .map((group) => ({
      group,
      release: earliestDatedRelease(group.releases.filter(isOfficial)),
    }))
    .filter(
      (candidate): candidate is {
        group: ReleaseGroupEvidence;
        release: ReleaseEditionEvidence;
      } => candidate.release !== null
    );

  const earliestOriginalDate = originalCandidates
    .map((candidate) => parseMusicBrainzDate(candidate.release.date))
    .filter((date): date is MusicBrainzPartialDate => date !== null)
    .sort((left, right) => dateLowerBound(left) - dateLowerBound(right))[0];
  const earliestOriginalCandidates = earliestOriginalDate
    ? originalCandidates.filter((candidate) => {
        const date = parseMusicBrainzDate(candidate.release.date);
        return date !== null && dateLowerBound(date) === dateLowerBound(earliestOriginalDate);
      })
    : [];
  const originalGroup =
    groupsWithUndatedOfficialReleases.length === 0 &&
    earliestOriginalCandidates.length === 1
      ? earliestOriginalCandidates[0].group
      : null;

  const eligiblePrimaryGroups = containingGroups.filter(isEligiblePrimaryGroup);
  const bestPrimaryRank = Math.max(
    0,
    ...eligiblePrimaryGroups.map(primaryTypeRank)
  );
  const bestPrimaryGroups = eligiblePrimaryGroups.filter(
    (group) => primaryTypeRank(group) === bestPrimaryRank
  );
  const hintedPrimaryGroups = bestPrimaryGroups.filter(
    (group) => group.albumHintMatch
  );
  const primaryGroup =
    bestPrimaryGroups.length === 0
      ? originalGroup
      : bestPrimaryGroups.length === 1
        ? bestPrimaryGroups[0]
        : hintedPrimaryGroups.length === 1
          ? hintedPrimaryGroups[0]
          : null;

  return {
    originalReleaseGroupId: originalGroup?.releaseGroupId ?? null,
    primaryReleaseGroupId: primaryGroup?.releaseGroupId ?? null,
    representativeReleaseId:
      representativeRelease(primaryGroup ?? originalGroup)?.releaseId ?? null,
    originalAmbiguous:
      groupsWithUndatedOfficialReleases.length > 0 ||
      earliestOriginalCandidates.length > 1,
    primaryAmbiguous:
      bestPrimaryGroups.length > 1 && hintedPrimaryGroups.length !== 1,
  };
};
