"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
// 24/outline rather than the app's usual 20/solid: these four glyphs sit in a
// row and have to balance against each other, which only holds if they share a
// viewBox and stroke weight. A solid play triangle next to a stroked chevron
// is a weight mismatch no amount of sizing fixes.
import {
  ArrowRightIcon,
  Bars3Icon,
  PlayIcon,
} from "@heroicons/react/24/outline";
// The one deliberate break from the outline set: the row that is actually
// playing fills in. Same 24 viewBox, so it swaps in at the same size.
import {
  PlayIcon as PlayingIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { usePlayer } from "@/components/player/GlobalPlayer";
import AddRecordingModal from "@/components/recording/AddRecordingModal";
import RecordingListRow from "@/components/recording/RecordingListRow";
import { SavedRecording } from "@/types/types";

// A row can only move up and down the list, so drop the horizontal drift dnd-kit
// would otherwise apply. Cheaper than pulling in @dnd-kit/modifiers for one line.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function SortableRecordingRow({
  recording,
  songId,
  songTitle,
  isSelected,
  isReorderable,
}: {
  recording: SavedRecording;
  songId: string;
  songTitle: string;
  isSelected: boolean;
  isReorderable: boolean;
}) {
  const { play, nowPlayingVideoId, isPlaying } = usePlayer();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recording.id, disabled: !isReorderable });
  const youtubeItem = recording.youtube_items[0];
  // Paused deliberately drops back to the resting state: the icon reports
  // what the player is doing, not which row was last clicked.
  const isNowPlaying =
    isPlaying && Boolean(youtubeItem) && youtubeItem.video_id === nowPlayingVideoId;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-stretch border-b hover:border-transparent hover:bg-paper-200 active:bg-paper-300 [&:has(+_li:hover)]:border-transparent ${
        isDragging
          ? "relative z-10 border-transparent bg-paper-200 shadow-md"
          : isSelected
            ? "border-transparent bg-paper-300"
            : "border-border-default"
      }`}
    >
      <Link
        href={`/song/${songId}/recording/${recording.id}`}
        aria-current={isSelected ? "page" : undefined}
        className="flex flex-1 min-w-0"
      >
        <RecordingListRow recording={recording} />
      </Link>
      {youtubeItem && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            play({
              name: recording.name,
              songTitle,
              artist: recording.artist,
              kind: recording.kind,
              youtubeVideoId: youtubeItem.video_id,
            });
          }}
          aria-label={isNowPlaying ? "Now playing" : "Play recording"}
          className={`p-3 shrink-0 self-center ${
            isNowPlaying
              ? "text-vermillion-600"
              : "text-ink-700 hover:text-action"
          }`}
        >
          {isNowPlaying ? (
            <PlayingIcon className="w-6 h-6" />
          ) : (
            <PlayIcon className="w-6 h-6" />
          )}
        </button>
      )}
      <Link
        href={`/song/${songId}/recording/${recording.id}`}
        aria-label="Open recording details"
        className="p-3 text-ink-700 hover:text-action shrink-0 self-center"
      >
        <ArrowRightIcon className="w-6 h-6" />
      </Link>
      {isReorderable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${recording.artist || recording.name}`}
          // touch-none keeps a drag on the handle from scrolling the pane
          // instead; the rest of the row still scrolls normally.
          className={`touch-none p-3 text-ink-700 hover:text-action shrink-0 self-center ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      )}
    </li>
  );
}

export default function RecordingsSection({
  songId,
  songTitle,
  recordings,
  onRecordingsChanged,
  onReorder,
}: {
  songId: string;
  songTitle: string;
  recordings: SavedRecording[];
  onRecordingsChanged: () =>
    | SavedRecording[]
    | null
    | void
    | Promise<SavedRecording[] | null | void>;
  onReorder: (reordered: SavedRecording[]) => Promise<boolean>;
}) {
  const { recordingId } = useParams<{ recordingId?: string | string[] }>();
  const [showAddRecording, setShowAddRecording] = useState(false);
  const selectedRecordingId = Array.isArray(recordingId)
    ? recordingId[0]
    : recordingId;
  // Nothing to arrange with a single recording, so the handles stay hidden
  // until ordering can actually mean something.
  const isReorderable = recordings.length > 1;

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a tap on the handle can
    // still be a plain click (and a focus target for the keyboard sensor).
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = recordings.findIndex((r) => r.id === active.id);
    const to = recordings.findIndex((r) => r.id === over.id);
    if (from === -1 || to === -1) return;
    void onReorder(arrayMove(recordings, from, to));
  };

  return (
    <>
      <div className="flex justify-between items-center mb-2 max-w-xl">
        <div className="flex items-center gap-2">
          <h3 className={`text-vermillion-700 text-2xl tracking-wide uppercase  ${leagueGothic.className}`}>
            Recordings
          </h3>
          <span
            className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-vermillion-700 text-white text-xs ${robotoCondensed.className}`}
          >
            {recordings.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddRecording(true)}
          aria-label="Add recording"
          className={`border-[2] border-vermillion-600 text-vermillion-600 p-2 py-1.75 rounded-sm tracking-widest uppercase flex font-medium items-center gap-1 ${robotoCondensed.className}`}
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add</span>
        </button>
      </div>
      {recordings.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[verticalOnly]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={recordings.map((recording) => recording.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul>
              {recordings.map((recording) => (
                <SortableRecordingRow
                  key={recording.id}
                  recording={recording}
                  songId={songId}
                  songTitle={songTitle}
                  isSelected={recording.id === selectedRecordingId}
                  isReorderable={isReorderable}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p>No recordings found for this song.</p>
      )}

      {showAddRecording && (
        <AddRecordingModal
          songId={songId}
          songTitle={songTitle}
          savedRecordings={recordings}
          onClose={() => setShowAddRecording(false)}
          onChanged={onRecordingsChanged}
        />
      )}
    </>
  );
}
