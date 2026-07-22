"use client";

import { useState } from "react";
import YoutubeSearchResultRow from "@/components/recording/YoutubeSearchResultRow";
import { YouTubeSearchResult } from "@/lib/youtube";

const result: YouTubeSearchResult = {
  videoId: "demo0000000",
  title: "Autumn Leaves - Bill Evans Trio (Live)",
  channelTitle: "JazzArchive - Topic",
  thumbnail: "",
  searchCategory: "song",
  discoverySource: "youtube_search",
};

export default function YoutubeSearchResultRowDemoPage() {
  const [adding, setAdding] = useState(false);

  return (
    <ul className="max-w-md">
      <YoutubeSearchResultRow
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
