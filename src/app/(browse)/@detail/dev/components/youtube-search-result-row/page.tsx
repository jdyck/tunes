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
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<"saving" | "removing" | null>(null);

  return (
    <ul className="max-w-md">
      <YoutubeSearchResultRow
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
