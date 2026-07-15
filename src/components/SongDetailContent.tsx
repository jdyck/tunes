"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tune, Recording } from "@/types/types";
import {
  ChevronRightIcon,
  PlayIcon,
  PlusCircleIcon,
} from "@heroicons/react/20/solid";
import { extractYouTubeID, fetchYouTubeVideoData } from "@/utils/youtube";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { usePlayer } from "@/components/GlobalPlayer";
import { useSongsList } from "@/components/SongsListContext";
import AddRecordingModal from "@/components/AddRecordingModal";
import RecordingListRow from "@/components/RecordingListRow";
import SongWritersEditor from "@/components/SongWritersEditor";
import SongWorkResultsList from "@/components/SongWorkResultsList";
import SaveStatusButton from "@/components/SaveStatusButton";
import FormField from "@/components/FormField";
import MusicBrainzLink from "@/components/MusicBrainzLink";
import SyncFromMusicBrainzButton from "@/components/SyncFromMusicBrainzButton";
import WikipediaBackgroundCard from "@/components/WikipediaBackgroundCard";
import DeleteButton from "@/components/DeleteButton";
import AsyncStateMessage from "@/components/AsyncStateMessage";
import { useFieldChange } from "@/hooks/useFieldChange";
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
import BackLink from "@/components/BackLink";
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

const formatWriterInputCredit = (writers: WriterInput[]) => {
  const names = writers
    .map((writer) => writer.name.trim())
    .filter(Boolean);
  const credited = Array.from(new Set(names));

  return credited.length > 0 ? credited.join(", ") : null;
};

const normalizeTitleText = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s*\n\s*/g, " ");

export default function SongDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { play } = usePlayer();
  const { patchTune, removeTune } = useSongsList();

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
  const [showWritersEditor, setShowWritersEditor] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);

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
    setShowWritersEditor(false);
    fetchTuneAndRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement || titleElement.textContent === title) return;

    titleElement.textContent = title;
  }, [title]);

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
      patchTune(id, { ...updatedFields, writers });
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

    const { error } = await supabase.from("tunes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting tune:", error.message);
      setError(`Error deleting tune: ${error.message}`);
    } else {
      removeTune(id);
      router.push("/songs");
    }
  };

  const handleFieldChange = useFieldChange(setIsSaved);

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setTitle(normalizeTitleText(e.currentTarget.textContent ?? ""));
    setIsSaved(false);
  };

  if (loading) return <AsyncStateMessage>Loading tune...</AsyncStateMessage>;
  if (error) return <AsyncStateMessage variant="error">{error}</AsyncStateMessage>;
  if (!tune) return <AsyncStateMessage>No tune found.</AsyncStateMessage>;

  const writerCredit = formatWriterInputCredit(writers);

  return (
    <div className="w-full p-4 bg-merino-100">
      <BackLink href="/songs" label="Back to songs" />
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex justify-between items-start gap-3 mb-3">
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Song title"
            onInput={handleTitleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData
                .getData("text/plain")
                .replace(/\s*\n\s*/g, " ");
              document.execCommand("insertText", false, text);
            }}
            className={`w-full min-w-0 break-words [text-wrap:balance] text-4xl uppercase leading-[1.15] bg-transparent pb-3 outline-none ${leagueGothic.className}`}
          >
            {title}
          </div>
          <SaveStatusButton isSaved={isSaved} />
        </div>

        {showWritersEditor ? (
          <SongWritersEditor
            value={writers}
            onClose={() => setShowWritersEditor(false)}
            onChange={(next) => {
              setWriters(next);
              setIsSaved(false);
            }}
          />
        ) : (
          <div className="mb-4">
            <span className="block text-sm mb-1">Writers</span>
            <button
              type="button"
              onClick={() => setShowWritersEditor(true)}
              className="block w-full text-left text-ink-700 hover:text-ink-900"
            >
              {writerCredit || "Add writers"}
            </button>
          </div>
        )}

        <FormField
          label="Year"
          type="text"
          value={year}
          onChange={handleFieldChange(setYear)}
          className="block mb-1"
          labelClassName="block text-xs text-ink-600"
          inputClassName="block w-full bg-transparent"
          placeholder="Year"
        />

        {musicbrainzWorkId && (
          <div className="mb-3">
            <SyncFromMusicBrainzButton
              syncing={syncingFromMusicBrainz}
              onClick={handleUpdateFromMusicBrainz}
            />
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
                <MusicBrainzLink type="work" id={musicbrainzWorkId} />
              )}

              {wikipediaExtract ? (
                <WikipediaBackgroundCard
                  extract={wikipediaExtract}
                  url={wikipediaUrl}
                  onRemove={handleRemoveBackground}
                />
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
                className="flex items-stretch border-b border-border-default hover:border-b-0 hover:bg-merino-200 active:bg-merino-300 [&:has(+_li:hover)]:border-b-0"
              >
                <Link
                  href={`/song/${id}/recording/${recording.id}`}
                  className="flex flex-1 min-w-0"
                >
                  <RecordingListRow recording={recording} videoInfo={videoInfo} />
                </Link>
                {extractYouTubeID(recording.url || "") && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      play(recording);
                    }}
                    aria-label="Play recording"
                    className="p-3 text-green-800 hover:text-green-900 shrink-0 self-center"
                  >
                    <PlayIcon className="w-6 h-6" />
                  </button>
                )}
                <Link
                  href={`/song/${id}/recording/${recording.id}`}
                  aria-label="Open recording details"
                  className="p-3 text-ink-700 hover:text-ink-900 shrink-0 self-center"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No recordings found for this tune.</p>
      )}

      <DeleteButton
        label="Song"
        confirmMessage="Are you sure you want to delete this tune? This action cannot be undone."
        onDelete={handleDelete}
      />

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
