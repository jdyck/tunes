"use client";

import SongWorkResultsList from "@/components/song/SongWorkResultsList";
import { SongWorkSearchResult } from "@/lib/musicbrainz";

const results: SongWorkSearchResult[] = [
  {
    workId: "demo-1",
    title: "Autumn Leaves",
    disambiguation: "jazz standard, english lyrics",
    composers: ["Joseph Kosma"],
    lyricists: ["Jacques Prévert"],
    writers: [],
  },
  {
    workId: "demo-2",
    title: "Autumn Leaves",
    disambiguation: "Coldcut version",
    composers: ["Joseph Kosma"],
    lyricists: ["Jacques Prévert"],
    writers: [],
  },
];

export default function SongWorkResultsListDemoPage() {
  return (
    <div className="max-w-md">
      <SongWorkResultsList
        results={results}
        onSelect={(result) => console.log("[demo] selected", result)}
      />
    </div>
  );
}
