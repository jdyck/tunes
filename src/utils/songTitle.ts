import type { Song, SongUserData } from "@/types/types";

export const effectiveSongTitle = (
  song: Pick<Song, "name">,
  userData?: Pick<SongUserData, "display_title"> | null
): string => userData?.display_title?.trim() || song.name;
