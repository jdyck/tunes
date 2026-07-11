"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tune } from "@/types/types";
import { WriterInput } from "@/utils/songWriters";

interface SongsListContextValue {
  tunes: Tune[];
  loading: boolean;
  fetchTunes: (userId: string) => Promise<void>;
  patchTune: (
    id: string,
    patch: Partial<Omit<Tune, "song_writers">> & { writers?: WriterInput[] }
  ) => void;
  removeTune: (id: string) => void;
}

const SongsListContext = createContext<SongsListContextValue | null>(null);

export function SongsListProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTunes = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("tunes")
      .select("*, song_writers(role, sort_order, people(name))")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching tunes:", error.message);
    } else {
      setTunes((data as Tune[]).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setLoading(false);
  }, []);

  const patchTune = useCallback(
    (
      id: string,
      patch: Partial<Omit<Tune, "song_writers">> & { writers?: WriterInput[] }
    ) => {
      const { writers, ...fields } = patch;
      setTunes((prev) =>
        prev.map((tune) =>
          tune.id === id
            ? {
                ...tune,
                ...fields,
                ...(writers
                  ? {
                      song_writers: writers
                        .filter((w) => w.name.trim())
                        .map((w) => ({
                          tune_id: id,
                          person_id: "",
                          role: w.role,
                          people: { id: "", name: w.name },
                        })),
                    }
                  : {}),
              }
            : tune
        )
      );
    },
    []
  );

  const removeTune = useCallback((id: string) => {
    setTunes((prev) => prev.filter((tune) => tune.id !== id));
  }, []);

  return (
    <SongsListContext.Provider
      value={{ tunes, loading, fetchTunes, patchTune, removeTune }}
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
