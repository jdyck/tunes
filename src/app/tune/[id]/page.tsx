// app/tune/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tune, Recording } from "@/types/types";
import Link from "next/link";
import YouTubePlayer from "@/components/YouTubePlayer";

export default function TunePage() {
  const { id } = useParams();
  const router = useRouter();

  const [tune, setTune] = useState<Tune | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState<YT.Player | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTuneAndRecordings = async () => {
      try {
        const { data: tuneData, error: tuneError } = await supabase
          .from("tunes")
          .select("*")
          .eq("id", id)
          .single();

        if (tuneError) {
          throw new Error(`Error fetching tune: ${tuneError.message}`);
        } else {
          setTune(tuneData as Tune);
        }

        const { data: recordingsData, error: recordingsError } = await supabase
          .from("recordings")
          .select("*")
          .eq("tune_id", id)
          .order("sortOrder");

        if (recordingsError) {
          throw new Error(
            `Error fetching recordings: ${recordingsError.message}`
          );
        } else {
          setRecordings(recordingsData as Recording[]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err); // This should log a detailed error
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    };

    fetchTuneAndRecordings();
  }, [id]);

  const handlePlay = (player: YT.Player) => {
    if (activePlayer && activePlayer !== player) {
      activePlayer.pauseVideo();
    }
    setActivePlayer(player);
  };

  if (loading) return <p>Loading tune...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!tune) return <p>No tune found.</p>;

  return (
    <div>
      <h1>{tune.name}</h1>
      <p>
        <strong>Year:</strong> {tune.year}
      </p>
      <p>
        <strong>Notes:</strong> {tune.notes}
      </p>

      <h2>Recordings</h2>
      {recordings.length > 0 ? (
        <ul>
          {recordings.map((recording) => (
            <li key={recording.id}>
              <strong>{recording.name}</strong> - {recording.rating}/5
              <p>{recording.notes}</p>
              {recording.url && extractYouTubeID(recording.url) ? (
                <YouTubePlayer
                  videoId={extractYouTubeID(recording.url)!}
                  onPlay={handlePlay}
                />
              ) : (
                <a
                  href={recording.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Listen
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No recordings found for this tune.</p>
      )}

      <Link href={`/tune/${id}/add-recording`}>
        <button>Add a Recording</button>
      </Link>

      <button onClick={() => router.back()}>Go Back</button>
    </div>
  );
}

// Helper function to extract YouTube video ID
const extractYouTubeID = (url: string) => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|.*v=))([\w-]{11})/
  );
  return match ? match[1] : null;
};
