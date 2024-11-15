// app/tune/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tune, Recording } from "@/types/types";
import Link from "next/link";
import {
  BoltIcon,
  BoltSlashIcon,
  PlusCircleIcon,
} from "@heroicons/react/20/solid";
import { fetchYouTubeVideoData, extractYouTubeID } from "@/utils/youtube";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function TunePage() {
  const { id } = useParams();
  const router = useRouter();

  const [tune, setTune] = useState<Tune | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [isSaved, setIsSaved] = useState(true);
  const [youtubeData, setYoutubeData] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    if (!id) return;

    const fetchTuneAndRecordings = async () => {
      try {
        const { data: tuneData, error: tuneError } = await supabase
          .from("tunes")
          .select("*")
          .eq("id", id)
          .single();

        if (tuneError)
          throw new Error(`Error fetching tune: ${tuneError.message}`);

        setTune(tuneData as Tune);
        setNotes(tuneData?.notes || "");

        const { data: recordingsData, error: recordingsError } = await supabase
          .from("recordings")
          .select("*")
          .eq("tune_id", id)
          .order("sortOrder");

        if (recordingsError)
          throw new Error(
            `Error fetching recordings: ${recordingsError.message}`
          );

        setRecordings(recordingsData as Recording[]);

        const videoData: { [key: string]: any } = {};
        await Promise.all(
          recordingsData.map(async (recording) => {
            const videoId = extractYouTubeID(recording.url);
            if (videoId && YOUTUBE_API_KEY) {
              const data = await fetchYouTubeVideoData(
                videoId,
                YOUTUBE_API_KEY
              );
              if (data) videoData[recording.id] = data;
            }
          })
        );
        setYoutubeData(videoData);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    };

    fetchTuneAndRecordings();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!id || !tune) return;

    const { error } = await supabase
      .from("tunes")
      .update({ notes })
      .eq("id", id);

    if (error) {
      console.error("Error updating notes:", error.message);
      setError(`Error updating notes: ${error.message}`);
    } else {
      setError(null);
      setIsSaved(true);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setIsSaved(false);
  };

  if (loading) return <p>Loading tune...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!tune) return <p>No tune found.</p>;

  return (
    <div className="w-full">
      <h1 className="font-bold text-2xl border-b mb-4 pb-2">{tune.name}</h1>

      <div className="w-full mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Notes</h3>
          <button
            onClick={handleSaveNotes}
            title={isSaved ? "Saved" : "Unsaved changes"}
            className="bg-white p-2 rounded-lg"
          >
            {isSaved ? (
              <BoltIcon className="h-5 w-5 text-green-500" />
            ) : (
              <BoltSlashIcon className="h-5 w-5 text-red-500" />
            )}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          rows={10}
          className="w-full p-1.5 rounded-md"
        />
      </div>

      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold">Recordings</h2>
        <Link href={`/tune/${id}/add-recording`} className="block p-2">
          <PlusCircleIcon
            className="h-6 w-6 text-blue-500"
            title="Add Recording"
          />
        </Link>
      </div>
      {recordings.length > 0 ? (
        <ul>
          {recordings.map((recording) => {
            const videoInfo = youtubeData[recording.id];
            return (
              <li
                key={recording.id}
                className="bg-white rounded-lg mb-4 overflow-hidden block"
              >
                <a
                  href={`/recording/${recording.id}`}
                  rel="noopener noreferrer"
                  className="flex"
                >
                  {videoInfo && (
                    <div className="flex overflow-hidden relative">
                      {videoInfo.thumbnails && videoInfo.thumbnails.high && (
                        <div className="w-20 h-auto overflow-hidden flex-shrink-0">
                          <img
                            src={videoInfo.thumbnails.high.url}
                            alt="Video thumbnail"
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <p className="p-4 pl-4 font-semibold leading-5 line-clamp-2 overflow-hidden text-ellipsis">
                        {videoInfo.title}
                      </p>
                    </div>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No recordings found for this tune.</p>
      )}

      <button onClick={() => router.back()}>Go Back</button>
    </div>
  );
}
