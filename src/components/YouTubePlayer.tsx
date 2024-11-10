// components/YouTubePlayer.tsx
import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string;
  onPlay: (player: YT.Player) => void;
}

export default function YouTubePlayer({ videoId, onPlay }: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null);
  const iframeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    // Function to initialize the player
    const loadPlayer = () => {
      try {
        playerRef.current = new YT.Player(iframeRef.current!, {
          videoId,
          events: {
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                onPlay(playerRef.current!);
              }
            },
          },
        });
      } catch (error) {
        console.error("YouTube player error:", error); // Logs YouTube player errors
      }
    };

    // Check if the API is ready and load the player
    if (window.YT && window.YT.Player) {
      loadPlayer();
    } else {
      window.onYouTubeIframeAPIReady = loadPlayer;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    return () => {
      playerRef.current?.destroy();
    };
  }, [videoId, onPlay]);

  return <div ref={iframeRef}></div>;
}
