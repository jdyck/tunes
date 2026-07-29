"use client";

import { useState } from "react";
import YtMusicSearchResultRow from "@/components/recording/YtMusicSearchResultRow";
import { YouTubeSearchResult } from "@/lib/youtube";

const result: YouTubeSearchResult = {
  videoId: "demo0000000",
  title: "Autumn Leaves",
  channelTitle: "Bill Evans Trio",
  thumbnail: "",
  searchCategory: "song",
  discoverySource: "ytmusic_search",
  albumName: "Portrait in Jazz",
  durationSeconds: 304,
};

export default function YtMusicSearchResultRowDemoPage() {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<"saving" | "removing" | null>(null);

  return (
    <ul className="max-w-md">
      <YtMusicSearchResultRow
        result={result}
        kind="released"
        saved={saved}
        pending={pending}
        onKindChange={() => {}}
        onPlay={() => console.log("[demo] play")}
        onToggle={() => {
          setPending(saved ? "removing" : "saving");
          setTimeout(() => {
            setSaved((previous) => !previous);
            setPending(null);
          }, 1000);
        }}
      />
    </ul>
  );
}
