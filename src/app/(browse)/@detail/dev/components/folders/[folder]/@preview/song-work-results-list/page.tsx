"use client";

import SongWorkResultsList from "@/components/song/SongWorkResultsList";
import { SongWorkSearchResult } from "@/lib/musicbrainz";

const results: SongWorkSearchResult[] = [
  {
    workId: "demo-1",
    title: "Autumn Leaves",
    disambiguation: "jazz standard, english lyrics",
    artistCredits: [
      {
        musicbrainzArtistId: "08c78e8d-3a3e-4cce-987c-48c47f2d4c31",
        canonicalName: "Joseph Kosma",
        creditedAs: "Joseph Kosma",
        artistKind: "person",
        role: "composer",
      },
      {
        musicbrainzArtistId: "db2e21f9-cc64-44b5-b8ac-005c9f90ef38",
        canonicalName: "Jacques Prévert",
        creditedAs: "Jacques Prévert",
        artistKind: "person",
        role: "lyricist",
      },
    ],
  },
  {
    workId: "demo-2",
    title: "Autumn Leaves",
    disambiguation: "Coldcut version",
    artistCredits: [
      {
        musicbrainzArtistId: "08c78e8d-3a3e-4cce-987c-48c47f2d4c31",
        canonicalName: "Joseph Kosma",
        creditedAs: "Joseph Kosma",
        artistKind: "person",
        role: "composer",
      },
      {
        musicbrainzArtistId: "db2e21f9-cc64-44b5-b8ac-005c9f90ef38",
        canonicalName: "Jacques Prévert",
        creditedAs: "Jacques Prévert",
        artistKind: "person",
        role: "lyricist",
      },
    ],
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
