"use client";

import { useState } from "react";
import YtMusicSearchResultRow from "@/components/recording/YtMusicSearchResultRow";
import { YouTubeSearchResult } from "@/lib/youtube";

const result: YouTubeSearchResult = {
  videoId: "demo0000000",
  title: "Autumn Leaves",
  channelTitle: "Bill Evans Trio",
  thumbnail: "",
  isMusic: true,
  album: "Portrait in Jazz",
  duration: "5:04",
};

export default function YtMusicSearchResultRowDemoPage() {
  const [adding, setAdding] = useState(false);

  return (
    <ul className="max-w-md">
      <YtMusicSearchResultRow
        result={result}
        adding={adding}
        onPlay={() => console.log("[demo] play")}
        onAdd={() => {
          setAdding(true);
          setTimeout(() => setAdding(false), 1000);
        }}
      />
    </ul>
  );
}
