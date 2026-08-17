// src/lib/songWriters.ts

import type {
  SongArtistCredit,
  SongArtistCreditInput,
} from "@/types/types";

export type WriterInput = SongArtistCreditInput;

export const formatWriterCredit = (
  credits: Pick<SongArtistCredit, "credited_as" | "artists">[]
): string | null => {
  const names = credits
    .map((credit) => credit.credited_as || credit.artists?.name)
    .filter((name): name is string => Boolean(name));
  const credited = Array.from(new Set(names));

  return credited.length > 0 ? credited.join(", ") : null;
};
