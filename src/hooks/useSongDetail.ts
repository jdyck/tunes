"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mapSongUserDataRow, songWithUserDataSelect } from "@/lib/songs";
import { fetchSongWriters, saveSongWriters, WriterInput } from "@/lib/songWriters";
import { useSongsList } from "@/components/song/SongsListContext";
import { SongWithUserData } from "@/types/types";
import { errorMessage } from "@/utils/errorMessage";
import { normalizeTags } from "@/utils/songTags";

export interface SongDetailSaveValues {
  title: string;
  sharedTitle: string;
  notes: string;
  favorite: boolean;
  tags: string[];
  year: string;
  wikipediaExtract: string | null;
  wikipediaUrl: string | null;
  musicbrainzWorkId: string | null;
  workDateStart: string | null;
  workDateEnd: string | null;
  writers: WriterInput[];
}

export function useSongDetail(id: string) {
  const { patchSong } = useSongsList();
  const [song, setSong] = useState<SongWithUserData | null>(null);
  const [writers, setWriters] = useState<WriterInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const tagSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const favoriteSaveQueue = useRef<Promise<void>>(Promise.resolve());

  const fetchSong = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: songData, error: songError }, { data: adminData }] =
        await Promise.all([
          supabase
            .from("song_user_data")
            .select(songWithUserDataSelect)
            .eq("song_id", id)
            .single(),
          supabase.rpc("is_site_admin"),
        ]);
      if (songError) throw new Error(`Error fetching Song: ${songError.message}`);
      const mappedSong = mapSongUserDataRow(songData as never);
      if (!mappedSong) throw new Error("Song not found in your list");

      const fetchedWriters = await fetchSongWriters(id);
      setSong(mappedSong);
      setWriters(fetchedWriters);
      setIsAdmin(Boolean(adminData));
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      setError(errorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchSong();
  }, [fetchSong]);

  const save = useCallback(async (values: SongDetailSaveValues) => {
    if (!song) return null;
    const canEditShared = isAdmin || !song.is_discoverable;
    const usesPrivateTitle =
      song.is_discoverable || Boolean(song.user_data.display_title?.trim());
    const normalizedDisplayTitle = usesPrivateTitle
      ? values.title.trim() || null
      : null;
    const nextSharedTitle = usesPrivateTitle
      ? values.sharedTitle.trim()
      : values.title.trim();

    if (canEditShared && !nextSharedTitle) {
      setError("A shared Song title is required.");
      return null;
    }

    const tags = normalizeTags(values.tags);
    const sharedFields = {
      name: nextSharedTitle,
      year: values.year || null,
      wikipedia_extract: values.wikipediaExtract,
      wikipedia_url: values.wikipediaUrl,
      musicbrainz_work_id: values.musicbrainzWorkId,
      work_date_start: values.workDateStart,
      work_date_end: values.workDateEnd,
    };
    const { error: privateError } = await supabase
      .from("song_user_data")
      .update({
        notes: values.notes.trim() || null,
        display_title: normalizedDisplayTitle,
        favorite: values.favorite,
        tags: tags.length ? tags : null,
      })
      .eq("song_id", id);

    if (privateError) {
      console.error("Error saving private Song data:", privateError.message);
      setError(`Error saving Song data: ${privateError.message}`);
      return null;
    }

    try {
      let savedWriters = values.writers;
      if (canEditShared) {
        const { error: sharedError } = await supabase
          .from("songs")
          .update(sharedFields)
          .eq("id", id);
        if (sharedError) throw sharedError;
        savedWriters = await saveSongWriters(id, values.writers);
      }

      const nextUserData = {
        ...song.user_data,
        notes: values.notes.trim() || null,
        display_title: normalizedDisplayTitle,
        favorite: values.favorite,
        tags: tags.length ? tags : null,
      };
      const nextSong = {
        ...song,
        ...(canEditShared ? sharedFields : {}),
        user_data: nextUserData,
      };
      setSong(nextSong);
      setWriters(savedWriters);
      setError(null);
      patchSong(id, {
        ...(canEditShared ? sharedFields : {}),
        user_data: nextUserData,
        ...(canEditShared ? { writers: savedWriters } : {}),
      });
      return { song: nextSong, writers: savedWriters };
    } catch (saveError) {
      const message = errorMessage(saveError);
      console.error("Error saving writers:", saveError);
      setError(`Error saving writers: ${message}`);
      return null;
    }
  }, [id, isAdmin, patchSong, song]);

  const setDiscoverability = useCallback(async (nextValue: boolean) => {
    if (!song || !isAdmin) return false;
    const { error: toggleError } = await supabase.rpc("set_song_discoverability", {
      p_song_id: id,
      p_is_discoverable: nextValue,
    });
    if (toggleError) {
      setError(`Could not change visibility: ${toggleError.message}`);
      return false;
    }
    const nextSong = {
      ...song,
      is_discoverable: nextValue,
      first_discoverable_at:
        nextValue && !song.first_discoverable_at
          ? new Date().toISOString()
          : song.first_discoverable_at,
    };
    setSong(nextSong);
    patchSong(id, {
      is_discoverable: nextValue,
      first_discoverable_at: nextSong.first_discoverable_at,
    });
    setError(null);
    return true;
  }, [id, isAdmin, patchSong, song]);

  const saveTags = useCallback((nextTags: string[]) => {
    const tags = normalizeTags(nextTags);
    const operation = tagSaveQueue.current.then(async () => {
      try {
        const { error: tagsError } = await supabase
          .from("song_user_data")
          .update({ tags: tags.length ? tags : null })
          .eq("song_id", id);
        if (tagsError) throw tagsError;
      } catch (tagsError) {
        const message = errorMessage(tagsError);
        console.error("Error saving Song tags:", tagsError);
        setError(`Could not save Song tags: ${message}`);
        return false;
      }
      patchSong(id, { user_data: { tags: tags.length ? tags : null } });
      return true;
    });
    tagSaveQueue.current = operation.then(() => undefined);
    return operation;
  }, [id, patchSong]);

  const saveFavorite = useCallback((favorite: boolean) => {
    const operation = favoriteSaveQueue.current.then(async () => {
      try {
        const { error: favoriteError } = await supabase
          .from("song_user_data")
          .update({ favorite })
          .eq("song_id", id);
        if (favoriteError) throw favoriteError;
      } catch (favoriteError) {
        const message = errorMessage(favoriteError);
        console.error("Error saving Song favorite:", favoriteError);
        setError(`Could not save Song favorite: ${message}`);
        return false;
      }
      patchSong(id, { user_data: { favorite } });
      return true;
    });
    favoriteSaveQueue.current = operation.then(() => undefined);
    return operation;
  }, [id, patchSong]);

  return {
    song,
    writers,
    loading,
    error,
    isAdmin,
    setError,
    save,
    saveFavorite,
    saveTags,
    setDiscoverability,
  };
}
