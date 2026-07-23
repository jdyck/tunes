import { parseMusicBrainzDate } from "./musicbrainzMatching.ts";

export interface MusicBrainzWriterDateRelation {
  type: string;
  begin?: string;
}

const WRITER_RELATION_TYPES = new Set(["composer", "lyricist", "writer"]);

export const earliestMusicBrainzWriterYear = (
  relations: MusicBrainzWriterDateRelation[]
): string | null => {
  const years = relations.flatMap((relation) => {
    if (!WRITER_RELATION_TYPES.has(relation.type)) return [];

    const date = parseMusicBrainzDate(relation.begin);
    return date ? [date.year] : [];
  });

  if (years.length === 0) return null;
  return Math.min(...years).toString().padStart(4, "0");
};
