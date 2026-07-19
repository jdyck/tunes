"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRightIcon,
  PlayIcon,
  PlusCircleIcon,
} from "@heroicons/react/20/solid";
import { extractYouTubeID } from "@/lib/youtube";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { usePlayer } from "@/components/player/GlobalPlayer";
import AddRecordingModal from "@/components/recording/AddRecordingModal";
import RecordingListRow from "@/components/recording/RecordingListRow";
import { Recording } from "@/types/types";

export default function RecordingsSection({
  songId,
  songTitle,
  recordings,
  youtubeData,
  onRecordingAdded,
}: {
  songId: string;
  songTitle: string;
  recordings: Recording[];
  youtubeData: { [key: string]: any };
  onRecordingAdded: () => void;
}) {
  const { play } = usePlayer();
  const [showAddRecording, setShowAddRecording] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center mb-2 max-w-xl">
        <div className="flex items-center gap-2">
          <h3 className={`text-mojo-700 text-2xl tracking-wide uppercase  ${leagueGothic.className}`}>
            Recordings
          </h3>
          <span
            className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-mojo-700 text-white text-xs ${robotoCondensed.className}`}
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
                  href={`/song/${songId}/recording/${recording.id}`}
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
                  href={`/song/${songId}/recording/${recording.id}`}
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
        <p>No recordings found for this song.</p>
      )}

      {showAddRecording && (
        <AddRecordingModal
          songId={songId}
          songTitle={songTitle}
          onClose={() => setShowAddRecording(false)}
          onAdded={() => {
            setShowAddRecording(false);
            onRecordingAdded();
          }}
        />
      )}
    </>
  );
}
