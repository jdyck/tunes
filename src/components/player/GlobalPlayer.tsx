"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { RecordingKind } from "@/types/types";
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from "@heroicons/react/20/solid";

export interface Playable {
  name: string;
  songTitle?: string | null;
  youtubeVideoId: string;
  artist?: string | null;
  kind?: RecordingKind | null;
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

  const videoId = recording?.youtubeVideoId ?? null;

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

      <div className="fixed bottom-0 inset-x-0 z-[var(--layer-player)] border-t border-line-100 bg-surface-app pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:left-0 lg:w-64 lg:border-r">
        {recording ? (
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3">
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
              {recording.songTitle && recording.songTitle !== recording.name && (
                <p className="text-xs text-ink-700 truncate">
                  {recording.songTitle}
                </p>
              )}
              {recording.artist && (
                <p className="text-xs text-ink-600 truncate">
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
              <div className="flex justify-between text-[10px] text-ink-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsVideoVisible((v) => !v)}
              aria-label={isVideoVisible ? "Hide video" : "Show video"}
              className="text-ink-600 shrink-0"
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
              className="text-ink-400 shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-3 items-center gap-3 text-ink-400">
            <div className={`flex gap-3`}>
              <div className={`bg-ink-800 w-10 h-10`}></div>
              <div className={`text-xs`}>
                <p className={`font-bold`}>Title</p>
                <p>Artist</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={
          recording && isVideoVisible
            ? "yt-album-art fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-2 z-[var(--layer-player)] aspect-square w-32 overflow-hidden rounded-md bg-black shadow-lg sm:w-40 lg:left-0 lg:w-64 lg:rounded-none"
            : "fixed left-[-9999px] top-0 w-80 aspect-video"
        }
      >
        <div className="w-full h-full" ref={hostRef} />
      </div>
    </PlayerContext.Provider>
  );
}
