"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SongWithUserData } from "@/types/types";
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
import AsyncStateMessage from "@/components/ui/AsyncStateMessage";
import NotesField from "@/components/ui/NotesField";
import { useFieldChange } from "@/hooks/useFieldChange";
import {
  WriterInput,
  fetchSongWriters,
  saveSongWriters,
} from "@/lib/songWriters";
import { writersFromMusicBrainz } from "@/utils/writerCredits";
import { SongWorkSearchResult } from "@/lib/musicbrainz";
import {
  searchSongMetadata,
  fetchWorkDetail,
  fetchWorkBackground,
} from "@/lib/songMetadataClient";
import PaneHeader from "@/components/layout/PaneHeader";
import LinkButton from "@/components/ui/LinkButton";
import { useSavedRecordings } from "@/hooks/useSavedRecordings";
import {
  mapSongUserDataRow,
  songWithUserDataSelect,
} from "@/lib/songs";
import { effectiveSongTitle } from "@/utils/songTitle";

const formatWriterInputCredit = (writers: WriterInput[]) => {
  const names = writers
    .map((writer) => writer.creditedAs.trim())
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
  const {
    recordings,
    loading: recordingsLoading,
    error: recordingsError,
    refresh: refreshRecordings,
  } = useSavedRecordings(id);

  const [song, setSong] = useState<SongWithUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [sharedTitle, setSharedTitle] = useState("");
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
  const [showWritersEditor, setShowWritersEditor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [removing, setRemoving] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);

  const fetchSongAndRecordings = async () => {
    try {
      const [{ data: songData, error: songError }, { data: adminData }] =
        await Promise.all([
          supabase
            .from("song_user_data")
            .select(songWithUserDataSelect)
            .eq("song_id", id)
            .single(),
          supabase.rpc("is_site_admin"),
        ]);

      if (songError) {
        throw new Error(`Error fetching Song: ${songError.message}`);
      }

      const mappedSong = mapSongUserDataRow(songData as never);
      if (!mappedSong) throw new Error("Song not found in your list");

      setSong(mappedSong);
      setIsAdmin(Boolean(adminData));
      setNotes(mappedSong.user_data.notes || "");
      setTitle(effectiveSongTitle(mappedSong, mappedSong.user_data));
      setSharedTitle(mappedSong.name || "");
      setYear(mappedSong.year || "");
      setWikipediaExtract(mappedSong.wikipedia_extract || null);
      setWikipediaUrl(mappedSong.wikipedia_url || null);
      setMusicbrainzWorkId(mappedSong.musicbrainz_work_id || null);
      setWriters(await fetchSongWriters(id));

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

    const canEditShared = isAdmin || !song.is_discoverable;
    const usesPrivateTitle =
      song.is_discoverable || Boolean(song.user_data.display_title?.trim());
    const normalizedDisplayTitle = usesPrivateTitle
      ? title.trim() || null
      : null;
    const nextSharedTitle = usesPrivateTitle ? sharedTitle.trim() : title.trim();

    if (canEditShared && !nextSharedTitle) {
      setError("A shared Song title is required.");
      return;
    }

    const sharedFields = {
      name: nextSharedTitle,
      year: year || null,
      wikipedia_extract: wikipediaExtract,
      wikipedia_url: wikipediaUrl,
      musicbrainz_work_id: musicbrainzWorkId,
    };

    const { error: privateError } = await supabase
      .from("song_user_data")
      .update({
        notes: notes.trim() || null,
        display_title: normalizedDisplayTitle,
      })
      .eq("song_id", id);

    if (privateError) {
      console.error("Error saving private Song data:", privateError.message);
      setError(`Error saving Song data: ${privateError.message}`);
      return;
    }

    try {
      let savedWriters = writers;
      if (canEditShared) {
        const { error: sharedError } = await supabase
          .from("songs")
          .update(sharedFields)
          .eq("id", id);
        if (sharedError) throw sharedError;
        savedWriters = await saveSongWriters(id, writers);
        setWriters(savedWriters);
      }

      const nextUserData = {
        ...song.user_data,
        notes: notes.trim() || null,
        display_title: normalizedDisplayTitle,
      };
      const nextSong = {
        ...song,
        ...(canEditShared ? sharedFields : {}),
        user_data: nextUserData,
      };
      const effectiveTitle = effectiveSongTitle(nextSong, nextUserData);
      setSong(nextSong);
      setSharedTitle(nextSong.name);
      setTitle(effectiveTitle);
      setError(null);
      setIsSaved(true);
      patchSong(id, {
        ...(canEditShared ? sharedFields : {}),
        user_data: nextUserData,
        ...(canEditShared ? { writers: savedWriters } : {}),
      });
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

    setSharedTitle(work.title);
    if (
      song &&
      !song.is_discoverable &&
      !song.user_data.display_title?.trim()
    ) {
      setTitle(work.title);
    }
    setWriters(writersFromMusicBrainz(work.artistCredits, writers));
    if (work.year) setYear(work.year);
    setIsSaved(false);
  };

  const handleOpenBackgroundSearch = async () => {
    setBackgroundError(null);
    setShowBackgroundSearch(true);
    setBackgroundSearching(true);
    try {
      setBackgroundSearchResults(await searchSongMetadata(sharedTitle));
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

  const handleRemove = async () => {
    if (!id) return;

    setRemoving(true);
    const { data: impactRows, error: impactError } = await supabase.rpc(
      "song_removal_impact",
      { p_song_id: id }
    );

    if (impactError) {
      setRemoving(false);
      setError(`Could not check removal impact: ${impactError.message}`);
      return;
    }

    const impact = impactRows?.[0];
    if (!impact) {
      setRemoving(false);
      setError("Could not determine how this Song should be removed.");
      return;
    }

    if (impact.action === "blocked") {
      setRemoving(false);
      setError(impact.blocked_reason);
      return;
    }

    const recordingCount = Number(impact.saved_recording_count || 0);
    const privateRecordingCopy =
      recordingCount === 0
        ? ""
        : `, plus your saved status and all private notes, ratings, tags, and ordering for ${recordingCount} ${
            recordingCount === 1 ? "Recording" : "Recordings"
          }`;
    const sharedCopy =
      impact.action === "delete_song"
        ? " The never-shared Song record will also be deleted."
        : " Shared Song and Recording information will remain.";
    const confirmed = window.confirm(
      `Remove this Song from your list? This permanently deletes your private notes and display title${privateRecordingCopy}.${sharedCopy} This cannot be undone.`
    );
    if (!confirmed) {
      setRemoving(false);
      return;
    }

    const { error } = await supabase.rpc("remove_song_from_library", {
      p_song_id: id,
    });

    if (error) {
      console.error("Error removing Song:", error.message);
      setError(`Error removing Song: ${error.message}`);
      setRemoving(false);
    } else {
      removeSong(id);
      router.push("/songs");
    }
  };

  const handleDiscoverabilityChange = async (nextValue: boolean) => {
    if (!song || !isAdmin) return;

    const { error: toggleError } = await supabase.rpc(
      "set_song_discoverability",
      { p_song_id: id, p_is_discoverable: nextValue }
    );

    if (toggleError) {
      setError(`Could not change visibility: ${toggleError.message}`);
      return;
    }

    const nextSong = {
      ...song,
      is_discoverable: nextValue,
      first_discoverable_at:
        nextValue && !song.first_discoverable_at
          ? new Date().toISOString()
          : song.first_discoverable_at,
    };
    setSong(nextSong);
    patchSong(id, {
      is_discoverable: nextValue,
      first_discoverable_at: nextSong.first_discoverable_at,
    });
    setError(null);
  };

  const handleFieldChange = useFieldChange(setIsSaved);

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setTitle(normalizeTitleText(e.currentTarget.textContent ?? ""));
    setIsSaved(false);
  };

  if (loading || recordingsLoading)
    return <AsyncStateMessage>Loading song...</AsyncStateMessage>;
  if ((error || recordingsError) && !song)
    return (
      <AsyncStateMessage variant="error">
        {error || recordingsError}
      </AsyncStateMessage>
    );
  if (!song) return <AsyncStateMessage>No song found.</AsyncStateMessage>;

  const writerCredit = formatWriterInputCredit(writers);
  const canEditShared = isAdmin || !song.is_discoverable;
  const titleEditsPrivate =
    song.is_discoverable || Boolean(song.user_data.display_title?.trim());

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
              aria-label={titleEditsPrivate ? "Your Song title" : "Song title"}
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

            {showWritersEditor && canEditShared ? (
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
                {canEditShared ? (
                  <button
                    type="button"
                    onClick={() => setShowWritersEditor(true)}
                    className="block w-full text-left text-azure-600 hover:text-azure-500 font-bold text-lg/5 text-balance"
                  >
                    {writerCredit || "Add writers"}
                  </button>
                ) : (
                  <p className="font-bold text-lg/5 text-balance text-azure-600">
                    {writerCredit || "No writer credits"}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="grow-0 w-40">
            <div className="aspect-square bg-ink-500/10 w-36"></div>
          </div>
        </div>
      </PaneHeader>

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {(error || recordingsError) && (
          <p className="mb-3 text-sm text-mojo-600">
            {error || recordingsError}
          </p>
        )}
        <RecordingsSection
          songId={id}
          songTitle={title}
          recordings={recordings}
          onRecordingAdded={refreshRecordings}
        />
        <SaveStatusButton isSaved={isSaved} className="block relative shrink-0 mt-1" onClick={handleSave} />

        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {isAdmin && (
            <label className="mb-5 flex items-start gap-3 rounded-md border border-line-200 p-3">
              <input
                type="checkbox"
                checked={song.is_discoverable}
                disabled={!isSaved}
                onChange={(event) =>
                  handleDiscoverabilityChange(event.target.checked)
                }
                className="mt-1 disabled:opacity-50"
              />
              <span>
                <span className="block font-semibold">Visible to all users</span>
                <span className="block text-sm text-ink-600">
                  Other Standards users can find and add this Song. Your notes
                  and display title remain private.
                  {!isSaved && " Save other changes before changing visibility."}
                </span>
              </span>
            </label>
          )}

          {titleEditsPrivate && (
            <FormField
              label="Shared title"
              value={sharedTitle}
              onChange={handleFieldChange(setSharedTitle)}
              disabled={!canEditShared}
              className="block mb-3"
              labelClassName="block text-xs text-ink-600"
              inputClassName="block w-full bg-transparent disabled:text-ink-500"
            />
          )}

          <FormField
            label="Year"
            type="text"
            value={year}
            onChange={handleFieldChange(setYear)}
            disabled={!canEditShared}
            className="block mb-1"
            labelClassName="block text-xs text-ink-600"
            inputClassName="block w-full bg-transparent"
            placeholder="Year"
          />

          {musicbrainzWorkId && canEditShared && (
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
                    onRemove={canEditShared ? handleRemoveBackground : undefined}
                  />
                ) : canEditShared ? (
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
                ) : null}

                {canEditShared && (musicbrainzWorkId || wikipediaExtract) && (
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
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="mt-4 w-full rounded-md bg-mojo-600 px-4 py-2 font-bold text-white hover:bg-mojo-700 disabled:opacity-60"
        >
          {removing ? "Checking..." : "Remove Song"}
        </button>
      </div>
    </div>
  );
}
