import type { SongWithUserData } from "../types/types.ts";
import { hasTag, tagKey } from "./songTags.ts";

export interface SongFilters {
  favoriteOnly: boolean;
  includedTags: string[];
  excludeHoliday: boolean;
}

export const defaultExcludeHoliday = (date: Date): boolean => {
  const month = date.getMonth();
  const day = date.getDate();
  return month < 10 || (month === 10 && day <= 15);
};

export const matchesSongFilters = (
  song: SongWithUserData,
  filters: SongFilters
): boolean =>
  (!filters.favoriteOnly || song.user_data.favorite) &&
  filters.includedTags.every((tag) => hasTag(song.user_data.tags, tag)) &&
  (!filters.excludeHoliday || !hasTag(song.user_data.tags, "Holiday"));

export const projectedTagCount = (
  songs: readonly SongWithUserData[],
  filters: SongFilters,
  tag: string
): number => {
  const withoutCandidate = {
    ...filters,
    includedTags: filters.includedTags.filter(
      (selected) => tagKey(selected) !== tagKey(tag)
    ),
  };
  return songs.filter(
    (song) =>
      matchesSongFilters(song, withoutCandidate) &&
      hasTag(song.user_data.tags, tag)
  ).length;
};

export const projectedFavoriteCount = (
  songs: readonly SongWithUserData[],
  filters: SongFilters
): number =>
  songs.filter((song) =>
    matchesSongFilters(song, { ...filters, favoriteOnly: false })
  ).filter((song) => song.user_data.favorite).length;
