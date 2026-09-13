"use client";

import { useEffect, useRef, useState } from "react";
import DeleteButton from "@/components/ui/DeleteButton";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSongFiles } from "@/hooks/useSongFiles";
import type { SongFile } from "@/types/songFiles";
import {
  formatSongFileSize,
  songFileContentTypeLabel,
  validateSongFile,
} from "@/utils/songFiles";
import { leagueGothic } from "@/lib/fonts.ts";

type Preview = {
  songFile: SongFile;
  url: string;
};

export default function SongFilesSection({ songId }: { songId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    songFiles,
    loading,
    error,
    uploadingFileName,
    uploadProgress,
    deletingSongFileId,
    upload,
    load,
    remove,
  } = useSongFiles(songId);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    for (const file of files) {
      const validationError = validateSongFile(file);
      if (validationError) {
        setPickerError(`${file.name}: ${validationError}`);
        return;
      }
    }

    setPickerError(null);
    setRetryFile(null);
    for (const file of files) {
      if (!(await upload(file))) {
        setRetryFile(file);
        return;
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const openPreview = async (songFile: SongFile) => {
    const blob = await load(songFile.id);
    if (!blob) return;
    setPreview({ songFile, url: URL.createObjectURL(blob) });
  };

  const download = async (songFile: SongFile) => {
    const blob = await load(songFile.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = songFile.fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const deleteSongFile = async (songFile: SongFile) => {
    if (!(await remove(songFile.id))) return;
    if (preview?.songFile.id === songFile.id) setPreview(null);
  };

  const busy = uploadingFileName !== null || deletingSongFileId !== null;

  return (
    <section className="mt-7 max-w-xl" aria-labelledby="files-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3
            id="files-heading"
            className={`text-vermillion-700 text-2xl tracking-wide uppercase ${leagueGothic.className}`}
          >
            Files
          </h3>
          <p className="mt-1 text-sm text-ink-600">
            Private to you. PDF, JPEG, PNG, or WebP up to 15 MiB each.
          </p>
        </div>
        <label className="shrink-0 cursor-pointer border-[2px] border-vermillion-600 px-3 py-2 text-sm font-medium uppercase tracking-wider text-vermillion-600 hover:bg-paper-200 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          Add files
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            multiple
            disabled={busy}
            className="sr-only"
            onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))}
          />
        </label>
      </div>

      {uploadingFileName && (
        <p className="mt-3 text-sm text-ink-700" role="status">
          Uploading {uploadingFileName}… {uploadProgress}%
        </p>
      )}
      {(pickerError || error) && (
        <p className="mt-3 text-sm text-vermillion-600" role="alert">
          {pickerError || error}
        </p>
      )}
      {retryFile && !uploadingFileName && (
        <PrimaryButton
          className="mt-3 px-3 py-2 text-sm"
          onClick={() => void uploadFiles([retryFile])}
        >
          Retry {retryFile.name}
        </PrimaryButton>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-ink-600">Loading files…</p>
      ) : songFiles.length ? (
        <ul className="mt-3 divide-y divide-paper-500 border-y border-paper-500">
          {songFiles.map((songFile) => {
            const deleting = deletingSongFileId === songFile.id;
            return (
              <li key={songFile.id} className="py-3">
                <p className="break-words font-medium text-ink-800">
                  {songFile.fileName}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">
                  {songFileContentTypeLabel(songFile.contentType)} · {formatSongFileSize(songFile.sizeBytes)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-paper-600 px-2 py-1 text-sm text-ink-700 hover:bg-paper-200 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void openPreview(songFile)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-paper-600 px-2 py-1 text-sm text-ink-700 hover:bg-paper-200 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void download(songFile)}
                  >
                    Download
                  </button>
                  <DeleteButton
                    label={songFile.fileName}
                    actionLabel={deleting ? "Deleting…" : "Delete"}
                    confirmMessage={`Delete ${songFile.fileName}? This cannot be undone.`}
                    onDelete={() => void deleteSongFile(songFile)}
                    disabled={busy}
                    className="rounded border border-vermillion-600 px-2 py-1 text-sm text-vermillion-700 hover:bg-paper-200 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-600">No files added yet.</p>
      )}

      {preview && (
        <Modal title={preview.songFile.fileName} onClose={() => setPreview(null)}>
          {preview.songFile.contentType === "application/pdf" ? (
            <iframe
              title={`Preview ${preview.songFile.fileName}`}
              src={preview.url}
              className="h-[65vh] w-full border border-paper-600"
            />
          ) : (
            <img
              src={preview.url}
              alt={`Preview of ${preview.songFile.fileName}`}
              className="max-h-[65vh] w-full object-contain"
            />
          )}
        </Modal>
      )}
    </section>
  );
}
