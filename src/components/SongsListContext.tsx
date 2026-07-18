"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Song } from "@/types/types";
import { WriterInput } from "@/utils/songWriters";

interface SongsListContextValue {
  songs: Song[];
  loading: boolean;
  fetchSongs: (userId: string) => Promise<void>;
  patchSong: (
    id: string,
    patch: Partial<Omit<Song, "song_writers">> & { writers?: WriterInput[] }
  ) => void;
  removeSong: (id: string) => void;
}

const SongsListContext = createContext<SongsListContextValue | null>(null);

export function SongsListProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSongs = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("songs")
      .select("*, song_writers(role, sort_order, people(name))")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching songs:", error.message);
    } else {
      setSongs((data as Song[]).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setLoading(false);
  }, []);

  const patchSong = useCallback(
    (
      id: string,
      patch: Partial<Omit<Song, "song_writers">> & { writers?: WriterInput[] }
    ) => {
      const { writers, ...fields } = patch;
      setSongs((prev) =>
        prev.map((song) =>
          song.id === id
            ? {
                ...song,
                ...fields,
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
      value={{ songs, loading, fetchSongs, patchSong, removeSong }}
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
