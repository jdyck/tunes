"use client";

import { useState } from "react";
import YoutubeSearchResultRow from "@/components/YoutubeSearchResultRow";
import { YouTubeSearchResult } from "@/utils/youtube";

const result: YouTubeSearchResult = {
  videoId: "demo0000000",
  title: "Autumn Leaves - Bill Evans Trio (Live)",
  channelTitle: "JazzArchive - Topic",
  thumbnail: "",
  isMusic: true,
};

export default function YoutubeSearchResultRowDemoPage() {
  const [adding, setAdding] = useState(false);

  return (
    <ul className="max-w-md">
      <YoutubeSearchResultRow
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
