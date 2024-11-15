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
  TrashIcon,
} from "@heroicons/react/20/solid";
import { fetchYouTubeVideoData, extractYouTubeID } from "@/utils/youtube";
import { merriweather } from "@/lib/fonts";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function TunePage() {
  const { id } = useParams();
  const router = useRouter();

  const [tune, setTune] = useState<Tune | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [composer, setComposer] = useState<string>("");
  const [year, setYear] = useState<string>("");
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
        setTitle(tuneData?.name || "");
        setComposer(tuneData?.composer || "");
        setYear(tuneData?.year || "");

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

  const handleSave = async () => {
    if (!id || !tune) return;

    const updatedFields: Partial<Tune> = {
      notes,
      name: title,
      composer,
      year: year || null,
    };

    const { error } = await supabase
      .from("tunes")
      .update(updatedFields)
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

    const confirmed = window.confirm(
      "Are you sure you want to delete this tune? This action cannot be undone."
    );
    if (!confirmed) return;

    const { error } = await supabase.from("tunes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting tune:", error.message);
      setError(`Error deleting tune: ${error.message}`);
    } else {
      console.log("Tune deleted successfully!");
      router.push("/");
    }
  };

  const handleFieldChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsSaved(false);
    };

  if (loading) return <p>Loading tune...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!tune) return <p>No tune found.</p>;

  return (
    <div className="w-full">
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <input
            value={title}
            onChange={handleFieldChange(setTitle)}
            className={`font-bold text-2xl bg-transparent pb-2 ${merriweather.className}`}
          />
          <button
            type="submit"
            title={isSaved ? "Saved" : "Unsaved changes"}
            className="block relative"
          >
            {isSaved ? (
              <BoltIcon className="h-5 w-5 text-green-600" />
            ) : (
              <BoltSlashIcon className="h-5 w-5 text-red-600" />
            )}
          </button>
        </div>
        <div className="flex justify-between">
          <div className="mb-4">
            <label className="block text-sm font-bold mb-1 hidden">
              Composer
            </label>
            <input
              value={composer}
              onChange={handleFieldChange(setComposer)}
              className="block w-full bg-transparent rounded-md border-black"
              placeholder="Enter composer name"
            />
          </div>

          <div className="mb-4 text-right">
            <label className="block text-sm font-bold mb-1 hidden">Year</label>
            <input
              type="text"
              value={year}
              onChange={handleFieldChange(setYear)}
              className="block w-full rounded-md bg-transparent text-right"
              placeholder="Enter year"
            />
          </div>
        </div>

        <textarea
          value={notes}
          onChange={handleFieldChange(setNotes)}
          rows={10}
          className="w-full p-1.5 rounded-md mb-4"
          placeholder="Notes"
        />
      </form>

      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold">Recordings</h2>
        <Link href={`/tune/${id}/add-recording`} className="block p-2">
          <PlusCircleIcon
            className="h-6 w-6 text-green-600"
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

      <button
        onClick={handleDelete}
        className="mt-4 w-full px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
      >
        Delete Tune
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
