"use client";

import { useEffect, useRef, useState } from "react";
import { useSongsList } from "@/components/song/SongsListContext";
import RecordingsSection from "@/components/song/RecordingsSection";
import SongWritersEditor from "@/components/song/SongWritersEditor";
import SongDetailHeader from "@/components/song/SongDetailHeader";
import SongBackgroundSection from "@/components/song/SongBackgroundSection";
import SongDetailSkeleton from "@/components/song/SongDetailSkeleton";
import SaveAction from "@/components/ui/SaveAction";
import FormField from "@/components/ui/FormField";
import Switch from "@/components/ui/Switch";
import SyncFromMusicBrainzButton from "@/components/ui/SyncFromMusicBrainzButton";
import AsyncStateMessage from "@/components/ui/AsyncStateMessage";
import NotesField from "@/components/ui/NotesField";
import { useFieldChange } from "@/hooks/useFieldChange";
import { WriterInput } from "@/lib/songWriters";
import { writersFromMusicBrainz } from "@/utils/writerCredits";
import { fetchWorkDetail } from "@/lib/songMetadataClient";
import { useSavedRecordings } from "@/hooks/useSavedRecordings";
import { effectiveSongTitle } from "@/utils/songTitle";
import Modal from "@/components/ui/Modal";
import TagChipInput from "@/components/ui/TagChipInput";
import { collectTags } from "@/utils/songTags";
import { useSongDetail } from "@/hooks/useSongDetail";
import { useSaveLifecycle } from "@/hooks/useSaveLifecycle";

export default function SongDetailContent({
  id,
  backHref = "/songs",
  backLabel = "Back to songs",
  basePath,
}: {
  id: string;
  backHref?: string;
  backLabel?: string;
  basePath?: string;
}) {
  const recordingHrefBase = basePath ?? `/song/${id}`;
  const { songs } = useSongsList();
  const {
    song,
    writers: loadedWriters,
    loading,
    error,
    isAdmin,
    save,
    saveFavorite,
    saveTags,
    setDiscoverability,
  } = useSongDetail(id);
  const {
    recordings,
    loading: recordingsLoading,
    error: recordingsError,
    reorder: reorderRecordings,
  } = useSavedRecordings(id);
  const [notes, setNotes] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [sharedTitle, setSharedTitle] = useState("");
  const [writers, setWriters] = useState<WriterInput[]>([]);
  const [year, setYear] = useState("");
  const [workDateStart, setWorkDateStart] = useState<string | null>(null);
  const [workDateEnd, setWorkDateEnd] = useState<string | null>(null);
  const [wikipediaExtract, setWikipediaExtract] = useState<string | null>(null);
  const [wikipediaUrl, setWikipediaUrl] = useState<string | null>(null);
  const [musicbrainzWorkId, setMusicbrainzWorkId] = useState<string | null>(
    null
  );
  const [syncingFromMusicBrainz, setSyncingFromMusicBrainz] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showWritersEditor, setShowWritersEditor] = useState(false);
  const hydratedSongIdRef = useRef<string | null>(null);
  const saveLifecycle = useSaveLifecycle();

  useEffect(() => {
    if (!song || song.id !== id || hydratedSongIdRef.current === id) return;
    hydratedSongIdRef.current = id;
    setShowWritersEditor(false);
    setNotes(song.user_data.notes || "");
    setFavorite(song.user_data.favorite);
    setTags(song.user_data.tags ?? []);
    setTitle(effectiveSongTitle(song, song.user_data));
    setSharedTitle(song.name || "");
    setYear(song.year || "");
    setWorkDateStart(song.work_date_start || null);
    setWorkDateEnd(song.work_date_end || null);
    setWikipediaExtract(song.wikipedia_extract || null);
    setWikipediaUrl(song.wikipedia_url || null);
    setMusicbrainzWorkId(song.musicbrainz_work_id || null);
    setWriters(loadedWriters);
    saveLifecycle.reset();
  }, [id, loadedWriters, saveLifecycle.reset, song]);

  const handleSave = async () => {
    const saveRevision = saveLifecycle.beginSave();
    if (saveRevision === null) return;

    try {
      const result = await save({
        title,
        sharedTitle,
        notes,
        favorite,
        tags,
        year,
        wikipediaExtract,
        wikipediaUrl,
        musicbrainzWorkId,
        workDateStart,
        workDateEnd,
        writers,
      });
      if (result) {
        const savedCurrentRevision = saveLifecycle.saveSucceeded(saveRevision);
        if (savedCurrentRevision) {
          setWriters(result.writers);
          setSharedTitle(result.song.name);
          setTitle(effectiveSongTitle(result.song, result.song.user_data));
        }
      } else {
        saveLifecycle.saveFailed(
          saveRevision,
          "Changes weren't saved. Try again."
        );
      }
    } catch (saveError) {
      console.error("Error saving Song:", saveError);
      saveLifecycle.saveFailed(
        saveRevision,
        "Changes weren't saved. Try again."
      );
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
    setWorkDateStart(work.workDateStart);
    setWorkDateEnd(work.workDateEnd);
    saveLifecycle.markDirty();
  };

  const handleDiscoverabilityChange = async (nextValue: boolean) => {
    await setDiscoverability(nextValue);
  };

  const handleFieldChange = useFieldChange(saveLifecycle.markDirty);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    saveLifecycle.markDirty();
  };

  const handleFavoriteChange = (nextFavorite: boolean) => {
    setFavorite(nextFavorite);
    void saveFavorite(nextFavorite).then((saved) => {
      if (!saved) saveLifecycle.markDirty();
    });
  };

  if (loading || recordingsLoading)
    return <SongDetailSkeleton backHref={backHref} backLabel={backLabel} />;
  if ((error || recordingsError) && !song)
    return (
      <AsyncStateMessage variant="error">
        {error || recordingsError}
      </AsyncStateMessage>
    );
  if (!song) return <AsyncStateMessage>No song found.</AsyncStateMessage>;

  const firstRecording = recordings[0];

  const canEditShared = isAdmin || !song.is_discoverable;
  const titleEditsPrivate =
    song.is_discoverable || Boolean(song.user_data.display_title?.trim());

  return (
    <div className="w-full h-full flex flex-col bg-surface-app">
      <SongDetailHeader
        title={title}
        titleEditsPrivate={titleEditsPrivate}
        writers={writers}
        songId={id}
        canEditShared={canEditShared}
        firstRecording={firstRecording}
        favorite={favorite}
        onTitleChange={handleTitleChange}
        onToggleFavorite={handleFavoriteChange}
        onEditWriters={() => setShowWritersEditor(true)}
        backHref={backHref}
        backLabel={backLabel}
      />

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {(error || recordingsError) && (
          <p className="mb-3 text-sm text-vermillion-600">
            {error || recordingsError}
          </p>
        )}
        <RecordingsSection
          songId={id}
          songTitle={title}
          recordings={recordings}
          onReorder={reorderRecordings}
          recordingHrefBase={recordingHrefBase}
        />
        <SaveAction
          status={saveLifecycle.status}
          error={saveLifecycle.error}
          onSave={() => void handleSave()}
          className="mt-1"
        />

        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {isAdmin && (
            <label className="mb-5 flex items-start gap-3 rounded-md border border-paper-600 p-3">
              <Switch
                checked={song.is_discoverable}
                disabled={
                  saveLifecycle.isDirty || saveLifecycle.status === "saving"
                }
                onChange={handleDiscoverabilityChange}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold">Visible to all users</span>
                <span className="block text-sm text-ink-600">
                  Other Standards users can find and add this Song. Your notes
                  and display title remain private.
                  {saveLifecycle.isDirty &&
                    " Save other changes before changing visibility."}
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

          <TagChipInput
            label="Tags"
            value={tags}
            suggestions={collectTags(songs.map((item) => item.user_data.tags))}
            onChange={(nextTags) => {
              setTags(nextTags);
              void saveTags(nextTags).then((saved) => {
                if (!saved) saveLifecycle.markDirty();
              });
            }}
          />

          <SongBackgroundSection
            sharedTitle={sharedTitle}
            musicbrainzWorkId={musicbrainzWorkId}
            wikipediaExtract={wikipediaExtract}
            wikipediaUrl={wikipediaUrl}
            canEditShared={canEditShared}
            onChange={({
              musicbrainzWorkId: nextMusicbrainzWorkId,
              wikipediaExtract: nextWikipediaExtract,
              wikipediaUrl: nextWikipediaUrl,
            }) => {
              setMusicbrainzWorkId(nextMusicbrainzWorkId);
              setWikipediaExtract(nextWikipediaExtract);
              setWikipediaUrl(nextWikipediaUrl);
            }}
            onDirty={saveLifecycle.markDirty}
          />
        </form>
      </div>
      {showWritersEditor && canEditShared && (
        <Modal title="Edit writers" onClose={() => setShowWritersEditor(false)}>
          <SongWritersEditor
            value={writers}
            onChange={(next) => {
              setWriters(next);
              saveLifecycle.markDirty();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
