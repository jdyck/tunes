"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SongWithUserData } from "@/types/types";
import { WriterInput } from "@/lib/songWriters";
import { effectiveSongTitle } from "@/utils/songTitle";

type SongPatch = Partial<Omit<SongWithUserData, "song_artist_credits" | "user_data">> & {
  user_data?: Partial<SongWithUserData["user_data"]>;
  writers?: WriterInput[];
};

interface SongsListContextValue {
  songs: SongWithUserData[];
  loading: boolean;
  error: string | null;
  fetchSongs: (userId: string) => Promise<void>;
  patchSong: (id: string, patch: SongPatch) => void;
  removeSong: (id: string) => void;
}

const SongsListContext = createContext<SongsListContextValue | null>(null);

export function SongsListProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = useQuery(api.songs.listMine);
  const songs = useMemo(
    () =>
      ([...(result ?? [])] as SongWithUserData[]).sort((a, b) =>
        effectiveSongTitle(a, a.user_data).localeCompare(
          effectiveSongTitle(b, b.user_data),
        ),
      ),
    [result],
  );
  const loading = result === undefined;
  const error = null;

  const fetchSongs = useCallback(async (_userId: string) => {}, []);

  const patchSong = useCallback(
    (
      id: string,
      patch: SongPatch
    ) => {
      void id;
      void patch;
    },
    []
  );

  const removeSong = useCallback((id: string) => void id, []);

  return (
    <SongsListContext.Provider
      value={{ songs, loading, error, fetchSongs, patchSong, removeSong }}
    >
      {children}
    </SongsListContext.Provider>
  );
}

export function useSongsList() {
  const ctx = useContext(SongsListContext);
  if (!ctx) {
    throw new Error("useSongsList must be used within a SongsListProvider");
  }
  return ctx;
}
