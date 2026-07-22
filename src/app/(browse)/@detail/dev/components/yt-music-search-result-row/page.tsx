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
  const [adding, setAdding] = useState(false);

  return (
    <ul className="max-w-md">
      <YtMusicSearchResultRow
        result={result}
        kind="released"
        adding={adding}
        onKindChange={() => {}}
        onPlay={() => console.log("[demo] play")}
        onAdd={() => {
          setAdding(true);
          setTimeout(() => setAdding(false), 1000);
        }}
      />
    </ul>
  );
}
