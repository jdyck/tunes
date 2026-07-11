"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tune, Recording } from "@/types/types";
import {
  BoltIcon,
  BoltSlashIcon,
  PlayIcon,
  PlusCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { extractYouTubeID, fetchYouTubeVideoData } from "@/utils/youtube";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { usePlayer } from "@/components/GlobalPlayer";
import AddRecordingModal from "@/components/AddRecordingModal";
import SongWritersEditor from "@/components/SongWritersEditor";
import SongWorkResultsList from "@/components/SongWorkResultsList";
import {
  WriterInput,
  fetchSongWriters,
  saveSongWriters,
} from "@/utils/songWriters";
import { SongWorkSearchResult } from "@/utils/musicbrainz";
import {
  searchSongMetadata,
  fetchWorkDetail,
  fetchWorkBackground,
} from "@/utils/songMetadataClient";
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function SongDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { play } = usePlayer();

  const [tune, setTune] = useState<Tune | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [writers, setWriters] = useState<WriterInput[]>([]);
  const [year, setYear] = useState("");
  const [wikipediaExtract, setWikipediaExtract] = useState<string | null>(null);
  const [wikipediaUrl, setWikipediaUrl] = useState<string | null>(null);
  const [musicbrainzWorkId, setMusicbrainzWorkId] = useState<string | null>(
    null
  );
  const [showBackgroundSearch, setShowBackgroundSearch] = useState(false);
  const [backgroundSearchResults, setBackgroundSearchResults] = useState<
    SongWorkSearchResult[]
  >([]);
  const [backgroundSearching, setBackgroundSearching] = useState(false);
  const [lookingUpBackground, setLookingUpBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [syncingFromMusicBrainz, setSyncingFromMusicBrainz] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [youtubeData, setYoutubeData] = useState<{ [key: string]: any }>({});
  const [showAddRecording, setShowAddRecording] = useState(false);

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
      setYear(tuneData?.year || "");
      setWikipediaExtract(tuneData?.wikipedia_extract || null);
      setWikipediaUrl(tuneData?.wikipedia_url || null);
      setMusicbrainzWorkId(tuneData?.musicbrainz_work_id || null);
      setWriters(await fetchSongWriters(id));

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
            const data = await fetchYouTubeVideoData(videoId, YOUTUBE_API_KEY);
            if (data) videoData[recording.id] = data;
          }
        })
      );
      setYoutubeData(videoData);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchTuneAndRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!id || !tune) return;

    const updatedFields: Partial<Tune> = {
      notes,
      name: title,
      year: year || null,
      wikipedia_extract: wikipediaExtract,
      wikipedia_url: wikipediaUrl,
      musicbrainz_work_id: musicbrainzWorkId,
    };

    const { error } = await supabase
      .from("tunes")
      .update(updatedFields)
      .eq("id", id);

    if (error) {
      console.error("Error saving data:", error.message);
      setError(`Error saving data: ${error.message}`);
      return;
    }

    try {
      await saveSongWriters(id, writers);
      setError(null);
      setIsSaved(true);
    } catch (writersError) {
      const message =
        writersError instanceof Error
          ? writersError.message
          : String(writersError);
      console.error("Error saving writers:", message);
      setError(`Error saving writers: ${message}`);
    }
  };

  // Re-fetches title/writers/year from the linked MusicBrainz work and
  // overwrites the current form state with it -- separate from the
  // background/Wikipedia flow, which is its own explicit action.
  const handleUpdateFromMusicBrainz = async () => {
    if (!musicbrainzWorkId) return;

    setSyncError(null);
    setSyncingFromMusicBrainz(true);
    const work = await fetchWorkDetail(musicbrainzWorkId);
    setSyncingFromMusicBrainz(false);

    if (!work) {
      setSyncError("Couldn't fetch the latest data from MusicBrainz.");
      return;
    }

    setTitle(work.title);
    setWriters([
      ...work.composers.map((name) => ({ name, role: "composer" as const })),
      ...work.lyricists.map((name) => ({ name, role: "lyricist" as const })),
      ...work.writers.map((name) => ({ name, role: "writer" as const })),
    ]);
    if (work.year) setYear(work.year);
    setIsSaved(false);
  };

  const handleOpenBackgroundSearch = async () => {
    setBackgroundError(null);
    setShowBackgroundSearch(true);
    setBackgroundSearching(true);
    try {
      setBackgroundSearchResults(await searchSongMetadata(title));
    } catch {
      setBackgroundError("Couldn't look up song metadata. Try again later.");
    }
    setBackgroundSearching(false);
  };

  // Used once a MusicBrainz work is already linked -- fetches straight from
  // that work instead of re-searching by title.
  const handleLookUpBackground = async () => {
    if (!musicbrainzWorkId) return;

    setBackgroundError(null);
    setLookingUpBackground(true);
    const background = await fetchWorkBackground(musicbrainzWorkId);
    setLookingUpBackground(false);

    if (!background) {
      setBackgroundError("No Wikipedia background found for this song.");
      return;
    }

    setWikipediaExtract(background.extract);
    setWikipediaUrl(background.url);
    setIsSaved(false);
  };

  const handleSelectBackgroundWork = async (result: SongWorkSearchResult) => {
    setShowBackgroundSearch(false);
    setBackgroundSearchResults([]);
    setBackgroundError(null);
    setMusicbrainzWorkId(result.workId);
    setWikipediaExtract(null);
    setWikipediaUrl(null);
    setIsSaved(false);

    setLookingUpBackground(true);
    const background = await fetchWorkBackground(result.workId);
    setLookingUpBackground(false);

    if (!background) {
      setBackgroundError("No Wikipedia background found for this song.");
      return;
    }

    setWikipediaExtract(background.extract);
    setWikipediaUrl(background.url);
  };

  const handleRemoveBackground = () => {
    setWikipediaExtract(null);
    setWikipediaUrl(null);
    setIsSaved(false);
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
      router.push("/");
    }
  };

  const handleFieldChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsSaved(false);
    };

  if (loading) return <p className="p-4">Loading tune...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!tune) return <p className="p-4">No tune found.</p>;

  return (
    <div className="w-full p-4 bg-cream-100">
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <input
            value={title}
            onChange={handleFieldChange(setTitle)}
            className={`text-4xl uppercase bg-transparent pb-2 ${leagueGothic.className}`}
          />
          <button
            type="submit"
            title={isSaved ? "Saved" : "Unsaved changes"}
            className="block relative shrink-0"
          >
            {isSaved ? (
              <BoltIcon className="h-5 w-5 text-green-600" />
            ) : (
              <BoltSlashIcon className="h-5 w-5 text-red-600" />
            )}
          </button>
        </div>

        <SongWritersEditor
          value={writers}
          onChange={(next) => {
            setWriters(next);
            setIsSaved(false);
          }}
        />

        <label className="block mb-1">
          <span className="block text-xs text-ink-600">Year</span>
          <input
            type="text"
            value={year}
            onChange={handleFieldChange(setYear)}
            className="block w-full bg-transparent"
            placeholder="Year"
          />
        </label>

        {musicbrainzWorkId && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleUpdateFromMusicBrainz}
              disabled={syncingFromMusicBrainz}
              className="text-xs text-teal-700 underline disabled:opacity-70"
            >
              {syncingFromMusicBrainz
                ? "Updating..."
                : "Update from MusicBrainz"}
            </button>
            {syncError && (
              <p className="text-sm text-ink-600 mt-1">{syncError}</p>
            )}
          </div>
        )}

        <textarea
          value={notes}
          onChange={handleFieldChange(setNotes)}
          rows={6}
          className="w-full p-1.5 rounded-md mb-4 mt-3"
          placeholder="Notes"
        />

        <div className="mb-4">
          {showBackgroundSearch ? (
            backgroundSearching ? (
              <p className="text-sm text-ink-600">Looking up...</p>
            ) : (
              <SongWorkResultsList
                results={backgroundSearchResults}
                onSelect={handleSelectBackgroundWork}
              />
            )
          ) : (
            <>
              {musicbrainzWorkId && (
                <a
                  href={`https://musicbrainz.org/work/${musicbrainzWorkId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-teal-700 underline mb-1"
                >
                  View on MusicBrainz
                </a>
              )}

              {wikipediaExtract ? (
                <div className="p-3 rounded-md border border-line-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{wikipediaExtract}</p>
                    <button
                      type="button"
                      onClick={handleRemoveBackground}
                      aria-label="Remove background"
                      className="shrink-0"
                    >
                      <XMarkIcon className="h-5 w-5 text-ink-600" />
                    </button>
                  </div>
                  {wikipediaUrl && (
                    <a
                      href={wikipediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-700 underline"
                    >
                      via Wikipedia, CC BY-SA
                    </a>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={
                    musicbrainzWorkId
                      ? handleLookUpBackground
                      : handleOpenBackgroundSearch
                  }
                  disabled={lookingUpBackground}
                  className="text-sm text-teal-700 underline disabled:opacity-70"
                >
                  {lookingUpBackground ? "Looking up..." : "Look up background"}
                </button>
              )}

              {(musicbrainzWorkId || wikipediaExtract) && (
                <button
                  type="button"
                  onClick={handleOpenBackgroundSearch}
                  className="block text-xs text-ink-600 underline mt-1"
                >
                  Change match
                </button>
              )}
            </>
          )}
          {backgroundError && (
            <p className="text-sm text-ink-600 mt-1">{backgroundError}</p>
          )}
        </div>
      </form>

      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h2 className={`font-bold text-teal-700 text-xl uppercase  ${leagueGothic.className}`}>
            Recordings
          </h2>
          <span
            className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-teal-700 text-white text-xs ${robotoCondensed.className}`}
          >
            {recordings.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddRecording(true)}
          className="block p-2"
        >
          <PlusCircleIcon
            className="h-6 w-6 text-green-600"
            title="Add Recording"
          />
        </button>
      </div>

      {recordings.length > 0 ? (
        <ul>
          {recordings.map((recording) => {
            const videoInfo = youtubeData[recording.id];
            return (
              <li
                key={recording.id}
                className="bg-cream-100 rounded-lg mb-4 overflow-hidden flex items-stretch"
              >
                <Link
                  href={`/song/${id}/recording/${recording.id}`}
                  className="flex flex-1 min-w-0"
                >
                  <RecordingRow recording={recording} videoInfo={videoInfo} />
                </Link>
                {extractYouTubeID(recording.url || "") && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      play(recording);
                    }}
                    aria-label="Play recording"
                    className="p-3 text-green-800 shrink-0 self-center"
                  >
                    <PlayIcon className="w-6 h-6" />
                  </button>
                )}
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
        Delete Song
      </button>

      {showAddRecording && (
        <AddRecordingModal
          tuneId={id}
          tuneTitle={title}
          onClose={() => setShowAddRecording(false)}
          onAdded={() => {
            setShowAddRecording(false);
            fetchTuneAndRecordings();
          }}
        />
      )}
    </div>
  );
}

function RecordingRow({
  recording,
  videoInfo,
}: {
  recording: Recording;
  videoInfo: any;
}) {
  return (
    <div className="flex overflow-hidden relative">
      {videoInfo?.thumbnails?.high && (
        <div className="w-20 h-auto overflow-hidden shrink-0">
          <img
            src={videoInfo.thumbnails.high.url}
            alt="Video thumbnail"
            className="object-cover w-full h-full"
          />
        </div>
      )}
      <div className="p-4 pl-4 overflow-hidden">
        <p className="font-semibold leading-5 line-clamp-2 overflow-hidden text-ellipsis break-words">
          {videoInfo?.title ||
            recording.name ||
            recording.url ||
            "Untitled recording"}
        </p>
        {recording.artist && (
          <p className="text-sm text-ink-600">{recording.artist}</p>
        )}
      </div>
    </div>
  );
}
