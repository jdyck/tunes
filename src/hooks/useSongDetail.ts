"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { WriterInput } from "@/lib/songWriters";
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

const writersFromSong = (song: SongWithUserData): WriterInput[] =>
  (song.song_artist_credits ?? []).map((credit) => ({
    artistId: credit.artist_id,
    canonicalName: credit.artists?.name ?? credit.credited_as,
    creditedAs: credit.credited_as,
    role: credit.role,
    artistKind: credit.artists?.kind ?? null,
    musicbrainzArtistId: credit.artists?.musicbrainz_artist_id ?? null,
  }));

const toConvexWriters = (writers: WriterInput[]) =>
  writers.map((writer) => ({
    artistId: writer.artistId
      ? (writer.artistId as Id<"artists">)
      : null,
    canonicalName: writer.canonicalName ?? null,
    creditedAs: writer.creditedAs,
    role: writer.role,
    artistKind: writer.artistKind ?? null,
    musicbrainzArtistId: writer.musicbrainzArtistId ?? null,
  }));

export function useSongDetail(id: string) {
  const songId = id as Id<"songs">;
  const result = useQuery(api.songs.getMine, { songId });
  const updateSong = useMutation(api.songs.update);
  const updateFavorite = useMutation(api.songs.setFavorite);
  const updateTags = useMutation(api.songs.setTags);
  const updateDiscoverability = useMutation(api.songs.setDiscoverability);
  const [song, setSong] = useState<SongWithUserData | null>(null);
  const [writers, setWriters] = useState<WriterInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tagSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const favoriteSaveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setSong(null);
    setWriters([]);
    setError(null);
  }, [id]);

  useEffect(() => {
    if (!result) return;
    const nextSong = result.song as SongWithUserData;
    setSong(nextSong);
    setWriters(writersFromSong(nextSong));
  }, [result]);

  const isAdmin = result?.isAdmin ?? false;
  const loading = result === undefined && song === null;

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

    const parsedYear = values.year.trim() ? Number(values.year) : null;
    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) || parsedYear < -32768 || parsedYear > 32767)
    ) {
      setError("Year must be a whole number.");
      return null;
    }

    const tags = normalizeTags(values.tags);
    const sharedFields = {
      name: nextSharedTitle,
      year: parsedYear,
      wikipediaExtract: values.wikipediaExtract,
      wikipediaUrl: values.wikipediaUrl,
      musicbrainzWorkId: values.musicbrainzWorkId,
      workDateStart: values.workDateStart,
      workDateEnd: values.workDateEnd,
    };

    try {
      await updateSong({
        songId,
        privateData: {
          notes: values.notes.trim() || null,
          displayTitle: normalizedDisplayTitle,
          favorite: values.favorite,
          tags: tags.length ? tags : null,
        },
        shared: canEditShared ? sharedFields : null,
        writers: canEditShared ? toConvexWriters(values.writers) : null,
      });

      const nextUserData = {
        ...song.user_data,
        notes: values.notes.trim() || null,
        display_title: normalizedDisplayTitle,
        favorite: values.favorite,
        tags: tags.length ? tags : null,
      };
      const nextSong: SongWithUserData = {
        ...song,
        ...(canEditShared
          ? {
              name: sharedFields.name,
              year: parsedYear === null ? null : String(parsedYear),
              wikipedia_extract: sharedFields.wikipediaExtract,
              wikipedia_url: sharedFields.wikipediaUrl,
              musicbrainz_work_id: sharedFields.musicbrainzWorkId,
              work_date_start: sharedFields.workDateStart,
              work_date_end: sharedFields.workDateEnd,
            }
          : {}),
        user_data: nextUserData,
      };
      const savedWriters = canEditShared ? values.writers : writers;
      setSong(nextSong);
      setWriters(savedWriters);
      setError(null);
      return { song: nextSong, writers: savedWriters };
    } catch (saveError) {
      const message = errorMessage(saveError);
      console.error("Error saving Song:", saveError);
      setError(`Error saving Song: ${message}`);
      return null;
    }
  }, [isAdmin, song, songId, updateSong, writers]);

  const setDiscoverability = useCallback(async (nextValue: boolean) => {
    if (!song || !isAdmin) return false;
    try {
      await updateDiscoverability({ songId, isDiscoverable: nextValue });
      setSong({
        ...song,
        is_discoverable: nextValue,
        first_discoverable_at:
          nextValue && !song.first_discoverable_at
            ? new Date().toISOString()
            : song.first_discoverable_at,
      });
      setError(null);
      return true;
    } catch (toggleError) {
      setError(`Could not change visibility: ${errorMessage(toggleError)}`);
      return false;
    }
  }, [isAdmin, song, songId, updateDiscoverability]);

  const saveTags = useCallback((nextTags: string[]) => {
    const tags = normalizeTags(nextTags);
    const operation = tagSaveQueue.current.then(async () => {
      try {
        await updateTags({ songId, tags });
        return true;
      } catch (tagsError) {
        const message = errorMessage(tagsError);
        console.error("Error saving Song tags:", tagsError);
        setError(`Could not save Song tags: ${message}`);
        return false;
      }
    });
    tagSaveQueue.current = operation.then(() => undefined);
    return operation;
  }, [songId, updateTags]);

  const saveFavorite = useCallback((favorite: boolean) => {
    const operation = favoriteSaveQueue.current.then(async () => {
      try {
        await updateFavorite({ songId, favorite });
        return true;
      } catch (favoriteError) {
        const message = errorMessage(favoriteError);
        console.error("Error saving Song favorite:", favoriteError);
        setError(`Could not save Song favorite: ${message}`);
        return false;
      }
    });
    favoriteSaveQueue.current = operation.then(() => undefined);
    return operation;
  }, [songId, updateFavorite]);

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
