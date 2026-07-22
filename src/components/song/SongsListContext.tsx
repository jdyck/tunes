"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SongWithUserData } from "@/types/types";
import { WriterInput } from "@/lib/songWriters";
import {
  mapSongUserDataRow,
  songWithUserDataSelect,
} from "@/lib/songs";
import { effectiveSongTitle } from "@/utils/songTitle";

type SongPatch = Partial<Omit<SongWithUserData, "song_writers" | "user_data">> & {
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
  const [songs, setSongs] = useState<SongWithUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("song_user_data")
      .select(songWithUserDataSelect)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching songs:", error.message);
      setError(`Could not load Songs: ${error.message}`);
    } else {
      setSongs(
        (data ?? [])
          .map((row) => mapSongUserDataRow(row as never))
          .filter((row): row is SongWithUserData => row !== null)
          .sort((a, b) =>
            effectiveSongTitle(a, a.user_data).localeCompare(
              effectiveSongTitle(b, b.user_data)
            )
          )
      );
    }
    setLoading(false);
  }, []);

  const patchSong = useCallback(
    (
      id: string,
      patch: SongPatch
    ) => {
      const { writers, user_data: userDataPatch, ...fields } = patch;
      setSongs((prev) =>
        prev.map((song) =>
          song.id === id
            ? {
                ...song,
                ...fields,
                ...(userDataPatch
                  ? { user_data: { ...song.user_data, ...userDataPatch } }
                  : {}),
                ...(writers
                  ? {
                      song_writers: writers
                        .filter((w) => w.name.trim())
                        .map((w) => ({
                          song_id: id,
                          person_id: "",
                          role: w.role,
                          people: { id: "", name: w.name },
                        })),
                    }
                  : {}),
              }
            : song
        )
      );
    },
    []
  );

  const removeSong = useCallback((id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
  }, []);

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
