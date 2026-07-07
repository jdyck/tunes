"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";
import { fetchYouTubeVideoData, extractYouTubeID } from "@/utils/youtube";
import {
  BoltIcon,
  BoltSlashIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { usePlayer } from "@/components/GlobalPlayer";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function RecordingDetailContent({
  id,
  onClose,
}: {
  id: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { play } = usePlayer();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState("");
  const [duration, setDuration] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const fetchRecording = async () => {
      try {
        const { data: recordingData, error: recordingError } = await supabase
          .from("recordings")
          .select("*")
          .eq("id", id)
          .single();

        if (recordingError) {
          throw new Error(
            `Error fetching recording: ${recordingError.message}`
          );
        }

        setRecording(recordingData as Recording);
        setName(recordingData.name || "");
        setNotes(recordingData.notes || "");
        setArtist(recordingData.artist || "");
        setAlbum(recordingData.album || "");
        setYear(recordingData.year || "");
        setDuration(recordingData.duration || "");
        setKey(recordingData.key || "");
        setTempo(
          recordingData.tempo != null ? String(recordingData.tempo) : ""
        );
        setTags((recordingData.tags || []).join(", "));
        setVideoId(extractYouTubeID(recordingData.url));
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    };

    fetchRecording();
  }, [id]);

  const handleSave = async () => {
    if (!id || !recording) return;

    const { error } = await supabase
      .from("recordings")
      .update({
        name,
        notes,
        artist: artist || null,
        album: album || null,
        year: year || null,
        duration: duration || null,
        key: key || null,
        tempo: tempo ? parseInt(tempo, 10) : null,
        tags: tags
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : null,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving data:", error.message);
      setError(`Error saving data: ${error.message}`);
    } else {
      setError(null);
      setIsSaved(true);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this recording? This action cannot be undone."
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from("recordings").delete().eq("id", id);

    if (error) {
      console.error("Error deleting recording:", error.message);
      setError(`Error deleting recording: ${error.message}`);
    } else if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleFieldChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsSaved(false);
    };

  if (loading) return <p className="p-4">Loading recording...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!recording) return <p className="p-4">No recording found.</p>;

  return (
    <div className="w-full p-4">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close recording"
          className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <XMarkIcon className="w-4 h-4" />
          Close
        </button>
      )}

      {videoId && recording && (
        <button
          onClick={() => play(recording)}
          className="mb-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-800 text-white font-bold rounded-md hover:bg-green-900"
        >
          <PlayIcon className="w-5 h-5" />
          Play
        </button>
      )}
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <input
            value={name}
            onChange={handleFieldChange(setName)}
            className="font-bold text-2xl bg-transparent pb-2 w-full"
          />
          <button
            type="submit"
            title={isSaved ? "Saved" : "Unsaved changes"}
            className="block relative ml-2"
          >
            {isSaved ? (
              <BoltIcon className="h-5 w-5 text-green-600" />
            ) : (
              <BoltSlashIcon className="h-5 w-5 text-red-600" />
            )}
          </button>
        </div>

        <div className="mb-4">
          <label className="block">
            Artist
            <input
              value={artist}
              onChange={handleFieldChange(setArtist)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block">
            Album
            <input
              value={album}
              onChange={handleFieldChange(setAlbum)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block">
            Year
            <input
              value={year}
              onChange={handleFieldChange(setYear)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block">
            Duration
            <input
              value={duration}
              onChange={handleFieldChange(setDuration)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block">
            Key
            <input
              value={key}
              onChange={handleFieldChange(setKey)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block">
            Tempo (BPM)
            <input
              type="number"
              value={tempo}
              onChange={handleFieldChange(setTempo)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>
        <div className="mb-4">
          <label className="block">
            Tags (comma separated)
            <input
              value={tags}
              onChange={handleFieldChange(setTags)}
              className="block w-full p-1.5 rounded-md"
            />
          </label>
        </div>

        <textarea
          value={notes}
          onChange={handleFieldChange(setNotes)}
          rows={10}
          className="w-full p-1.5 rounded-md mb-4"
          placeholder="Add notes here"
        />
      </form>

      <button
        onClick={handleDelete}
        className="mt-4 w-full px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
      >
        Delete Recording
      </button>
    </div>
  );
}
