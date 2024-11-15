// src/recording/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";
import { fetchYouTubeVideoData, extractYouTubeID } from "@/utils/youtube";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function RecordingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [youtubeData, setYoutubeData] = useState<{ [key: string]: any } | null>(
    null
  );
  const [videoId, setVideoId] = useState<string | null>(null);

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
      <h1 className="font-bold text-2xl mb-4">{recording.name}</h1>

      <div className="mb-6">
        <p>
          <strong>Notes:</strong> {recording.notes || "No notes available."}
        </p>
      </div>

      <button
        onClick={() => router.back()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
      >
        Go Back
      </button>
    </div>
  );
}
