"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Song, Recording } from "@/types/types";
import { extractYouTubeID, fetchYouTubeVideoData } from "@/lib/youtube";
import { leagueGothic } from "@/lib/fonts";
import { useSongsList } from "@/components/song/SongsListContext";
import RecordingsSection from "@/components/song/RecordingsSection";
import SongWritersEditor from "@/components/song/SongWritersEditor";
import SongWorkResultsList from "@/components/song/SongWorkResultsList";
import SaveStatusButton from "@/components/ui/SaveStatusButton";
import FormField from "@/components/ui/FormField";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";
import SyncFromMusicBrainzButton from "@/components/ui/SyncFromMusicBrainzButton";
import WikipediaBackgroundCard from "@/components/song/WikipediaBackgroundCard";
import DeleteButton from "@/components/ui/DeleteButton";
import AsyncStateMessage from "@/components/ui/AsyncStateMessage";
import NotesField from "@/components/ui/NotesField";
import { useFieldChange } from "@/hooks/useFieldChange";
import {
  WriterInput,
  fetchSongWriters,
  saveSongWriters,
} from "@/lib/songWriters";
import { SongWorkSearchResult } from "@/lib/musicbrainz";
import {
  searchSongMetadata,
  fetchWorkDetail,
  fetchWorkBackground,
} from "@/lib/songMetadataClient";
import PaneHeader from "@/components/layout/PaneHeader";
import LinkButton from "@/components/ui/LinkButton";
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

const TITLE_MAX_FONT_PX = 60;
const TITLE_MIN_FONT_PX = 20;
const TITLE_LINE_HEIGHT_RATIO = 0.93;
const TITLE_MAX_LINES = 3;

// Long titles otherwise overflow to 6-7 lines at the display size \u2014 shrink
// the (fixed-height, unitless) line-height in step with font-size so it
// keeps scaling together, then binary-search down until it fits 3 lines.
const fitTitleFontSize = (element: HTMLElement) => {
  element.style.lineHeight = `${TITLE_LINE_HEIGHT_RATIO}`;

  let low = TITLE_MIN_FONT_PX;
  let high = TITLE_MAX_FONT_PX;
  let best = TITLE_MIN_FONT_PX;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    element.style.fontSize = `${mid}px`;
    const maxHeight = mid * TITLE_LINE_HEIGHT_RATIO * TITLE_MAX_LINES;

    if (element.scrollHeight <= maxHeight + 1) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  element.style.fontSize = `${best}px`;
};

export default function SongDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { patchSong, removeSong } = useSongsList();

  const [song, setSong] = useState<Song | null>(null);
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
  const [showWritersEditor, setShowWritersEditor] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const fetchSongAndRecordings = async () => {
    try {
      const { data: songData, error: songError } = await supabase
        .from("songs")
        .select("*")
        .eq("id", id)
        .single();

      if (songError)
        throw new Error(`Error fetching song: ${songError.message}`);

      setSong(songData as Song);
      setNotes(songData?.notes || "");
      setTitle(songData?.name || "");
      setYear(songData?.year || "");
      setWikipediaExtract(songData?.wikipedia_extract || null);
      setWikipediaUrl(songData?.wikipedia_url || null);
      setMusicbrainzWorkId(songData?.musicbrainz_work_id || null);
      setWriters(await fetchSongWriters(id));

      const { data: recordingsData, error: recordingsError } = await supabase
        .from("recordings")
        .select("*")
        .eq("song_id", id)
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
    fetchSongAndRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useLayoutEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;
    if (titleElement.textContent !== title) titleElement.textContent = title;

    fitTitleFontSize(titleElement);
    // `titleElement` doesn't exist yet while `loading` is true (an earlier
    // return renders <AsyncStateMessage> instead) -- re-run once it mounts.
  }, [title, loading]);

  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;

    const handleResize = () => fitTitleFontSize(titleElement);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [loading]);

  const handleSave = async () => {
    if (!id || !song) return;

    const updatedFields: Partial<Song> = {
      notes,
      name: title,
      year: year || null,
      wikipedia_extract: wikipediaExtract,
      wikipedia_url: wikipediaUrl,
      musicbrainz_work_id: musicbrainzWorkId,
    };

    const { error } = await supabase
      .from("songs")
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
      patchSong(id, { ...updatedFields, writers });
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

    const { error } = await supabase.from("songs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting song:", error.message);
      setError(`Error deleting song: ${error.message}`);
    } else {
      removeSong(id);
      router.push("/songs");
    }
  };

  const handleFieldChange = useFieldChange(setIsSaved);

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setTitle(normalizeTitleText(e.currentTarget.textContent ?? ""));
    setIsSaved(false);
  };

  if (loading) return <AsyncStateMessage>Loading song...</AsyncStateMessage>;
  if (error) return <AsyncStateMessage variant="error">{error}</AsyncStateMessage>;
  if (!song) return <AsyncStateMessage>No song found.</AsyncStateMessage>;

  const writerCredit = formatWriterInputCredit(writers);

  return (
    <div className="w-full h-full flex flex-col bg-surface-app">
      <PaneHeader backHref="/songs" backLabel="Back to songs" safeAreaTop>
        <div className="flex gap-4 w-xl max-w-full lg:max-w-md pb-8 items-center">
          <div className="w-full">
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
              className={`wrap-break-word text-balance text-6xl uppercase leading-14 bg-transparent outline-none ${leagueGothic.className} tracking-wide mb-2`}
            >
              {title}
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
              <div className="pb-4">
                <button
                  type="button"
                  onClick={() => setShowWritersEditor(true)}
                  className="block w-full text-left text-azure-600 hover:text-azure-500 font-bold text-lg/5 text-balance"
                >
                  {writerCredit || "Add writers"}
                </button>
              </div>
            )}
          </div>
          <div className="grow-0 w-40">
            <div className="aspect-square bg-ink-500/10 w-36"></div>
          </div>
        </div>
      </PaneHeader>

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <RecordingsSection
          songId={id}
          songTitle={title}
          recordings={recordings}
          youtubeData={youtubeData}
          onRecordingAdded={fetchSongAndRecordings}
        />
        <SaveStatusButton isSaved={isSaved} className="block relative shrink-0 mt-1" onClick={handleSave} />

        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
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

          <NotesField
            label="Notes"
            value={notes}
            onChange={handleFieldChange(setNotes)}
            rows={6}
            placeholder="Notes"
            className="w-full p-1.5 rounded-md mb-4 mt-3"
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
                  <LinkButton
                    variant="muted"
                    onClick={handleOpenBackgroundSearch}
                    className="block mt-1"
                  >
                    Change match
                  </LinkButton>
                )}
              </>
            )}
            {backgroundError && (
              <p className="text-sm text-ink-600 mt-1">{backgroundError}</p>
            )}
          </div>
        </form>
        <DeleteButton
          label="Song"
          confirmMessage="Are you sure you want to delete this song? This action cannot be undone."
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
