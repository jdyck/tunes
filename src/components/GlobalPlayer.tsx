"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Recording } from "@/types/types";
import { extractYouTubeID } from "@/utils/youtube";
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MusicalNoteIcon,
} from "@heroicons/react/20/solid";

export interface Playable {
  name: string;
  url?: string | null;
  artist?: string | null;
  kind?: Recording["kind"];
}

interface PlayerContextValue {
  play: (playable: Playable) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within GlobalPlayer");
  return ctx;
}

// Loads the YouTube IFrame API script once, resolving once it's ready —
// safe to call from multiple mounts, since window.onYouTubeIframeAPIReady
// only ever gets set once per page load in practice here.
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve();
    if (
      !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    ) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  });
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function GlobalPlayer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recording, setRecording] = useState<Playable | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // This div is handed to the YouTube IFrame API, which replaces it with an
  // actual <iframe> outside of React's knowledge. It must stay mounted at a
  // stable spot in the tree (never conditionally rendered/unmounted) or the
  // API loses its target and playback breaks.
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const videoId = recording?.url ? extractYouTubeID(recording.url) : null;

  const clearProgressPoll = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressPoll = useCallback(() => {
    clearProgressPoll();
    progressIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        setProgress(player.getCurrentTime());
      }
    }, 500);
  }, [clearProgressPoll]);

  useEffect(() => clearProgressPoll, [clearProgressPoll]);

  // (Re)create the YT player whenever the selected video changes.
  useEffect(() => {
    if (!videoId || !hostRef.current) return;
    let cancelled = false;

    loadYouTubeAPI().then(() => {
      if (cancelled || !hostRef.current) return;

      playerRef.current?.destroy();
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(event.target.getDuration());
              startProgressPoll();
            } else if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED
            ) {
              setIsPlaying(false);
              clearProgressPoll();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [videoId, startProgressPoll, clearProgressPoll]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  const play = useCallback((next: Playable) => {
    setRecording(next);
    setIsVideoVisible(next.kind === "video_capture");
    setProgress(0);
    setDuration(0);
  }, []);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setProgress(seconds);
  }, []);

  const close = useCallback(() => {
    playerRef.current?.destroy();
    playerRef.current = null;
    clearProgressPoll();
    setRecording(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [clearProgressPoll]);

  return (
    <PlayerContext.Provider value={{ play }}>
      {children}

      <div className="fixed bottom-0 inset-x-0 lg:inset-x-auto lg:left-0 lg:w-64 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] z-40">
        {recording ? (
          <div className="max-w-screen-md mx-auto px-4 py-2 flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="text-green-800 shrink-0"
            >
              {isPlaying ? (
                <PauseIcon className="w-8 h-8" />
              ) : (
                <PlayIcon className="w-8 h-8" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {recording.name}
              </p>
              {recording.artist && (
                <p className="text-xs text-gray-500 truncate">
                  {recording.artist}
                </p>
              )}
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={Math.min(progress, duration || 0)}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full"
                aria-label="Seek"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsVideoVisible((v) => !v)}
              aria-label={isVideoVisible ? "Hide video" : "Show video"}
              className="text-gray-500 shrink-0"
            >
              {isVideoVisible ? (
                <ChevronDownIcon className="w-5 h-5" />
              ) : (
                <ChevronUpIcon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={close}
              aria-label="Close player"
              className="text-gray-400 shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center gap-3 text-gray-400">
            <MusicalNoteIcon className="w-5 h-5 shrink-0" />
            <p className="text-sm">Nothing playing</p>
          </div>
        )}
      </div>

      <div
        className={
          recording && isVideoVisible
            ? "yt-album-art fixed bottom-[68px] left-2 w-32 sm:w-40 lg:left-0 lg:w-64 aspect-square bg-black rounded-md lg:rounded-none overflow-hidden shadow-lg z-40"
            : "fixed -left-[9999px] top-0 w-80 aspect-video"
        }
      >
        <div className="w-full h-full" ref={hostRef} />
      </div>
    </PlayerContext.Provider>
  );
}
