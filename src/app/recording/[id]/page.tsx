"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";
import { fetchYouTubeVideoData, extractYouTubeID } from "@/utils/youtube";
import { BoltIcon, BoltSlashIcon, TrashIcon } from "@heroicons/react/20/solid";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function RecordingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [name, setName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [youtubeData, setYoutubeData] = useState<{ [key: string]: any } | null>(
    null
  );
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    if (!id) return;

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

        const videoId = extractYouTubeID(recordingData.url);
        setVideoId(videoId);

        if (videoId && YOUTUBE_API_KEY) {
          const videoData = await fetchYouTubeVideoData(
            videoId,
            YOUTUBE_API_KEY
          );
          setYoutubeData(videoData);
        }

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
      .update({ name, notes })
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

    if (confirmDelete) {
      const { error } = await supabase.from("recordings").delete().eq("id", id);

      if (error) {
        console.error("Error deleting recording:", error.message);
        setError(`Error deleting recording: ${error.message}`);
      } else {
        console.log("Recording deleted successfully!");
        router.back(); // Redirect to previous page
      }
    }
  };

  const handleFieldChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsSaved(false);
    };

  if (loading) return <p>Loading recording...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!recording) return <p>No recording found.</p>;

  return (
    <div className="w-full p-4">
      {videoId && (
        <div className="mb-6">
          <div className="flex flex-col items-center overflow-hidden">
            <iframe
              width="300"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg mb-4 max-w-full aspect-square w-full"
            ></iframe>
          </div>
        </div>
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

      <button
        onClick={() => router.back()}
        className="mt-2 w-full px-4 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700"
      >
        Go Back
      </button>
    </div>
  );
}
