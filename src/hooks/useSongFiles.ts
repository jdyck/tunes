"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  deleteSongFile,
  fetchSongFileBlob,
  uploadSongFile,
} from "@/lib/songFiles";
import type { SongFile } from "@/types/songFiles";
import { errorMessage } from "@/utils/errorMessage";

export const useSongFiles = (songId: string) => {
  const result = useQuery(api.songFiles.listMine, {
    songId: songId as Id<"songs">,
  });
  const { getToken, sessionClaims } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingSongFileId, setDeletingSongFileId] = useState<string | null>(null);
  const [deletedSongFileIds, setDeletedSongFileIds] = useState<string[]>([]);

  useEffect(() => {
    if (!result) return;
    setDeletedSongFileIds((current) => {
      const remaining = current.filter((id) =>
        result.some((songFile) => songFile.id === id),
      );
      return remaining.length === current.length ? current : remaining;
    });
  }, [result]);

  const getConvexToken = useCallback(async () => {
    const token = await getToken(
      sessionClaims?.aud === "convex" ? {} : { template: "convex" },
    );
    if (!token) throw new Error("Your session has expired. Sign in again and retry.");
    return token;
  }, [getToken, sessionClaims]);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploadingFileName(file.name);
      setUploadProgress(0);
      try {
        await uploadSongFile({
          songId,
          file,
          token: await getConvexToken(),
          onProgress: setUploadProgress,
        });
        return true;
      } catch (problem) {
        setError(`Could not upload ${file.name}: ${errorMessage(problem)}`);
        return false;
      } finally {
        setUploadingFileName(null);
      }
    },
    [getConvexToken, songId],
  );

  const load = useCallback(
    async (songFileId: string) => {
      setError(null);
      try {
        return await fetchSongFileBlob(songFileId, await getConvexToken());
      } catch (problem) {
        setError(`Could not load the file: ${errorMessage(problem)}`);
        return null;
      }
    },
    [getConvexToken],
  );

  const remove = useCallback(
    async (songFileId: string) => {
      setError(null);
      setDeletingSongFileId(songFileId);
      try {
        await deleteSongFile(songFileId, await getConvexToken());
        setDeletedSongFileIds((current) => [...current, songFileId]);
        return true;
      } catch (problem) {
        setError(`Could not delete the file: ${errorMessage(problem)}`);
        return false;
      } finally {
        setDeletingSongFileId(null);
      }
    },
    [getConvexToken],
  );

  return {
    songFiles: ((result ?? []) as SongFile[]).filter(
      (songFile) => !deletedSongFileIds.includes(songFile.id),
    ),
    loading: result === undefined,
    error,
    uploadingFileName,
    uploadProgress,
    deletingSongFileId,
    upload,
    load,
    remove,
  };
};
