"use client";

import { useParams } from "next/navigation";
import ArtistDetailContent from "@/components/artist/ArtistDetailContent";

export default function SongArtistPanelPage() {
  const { id, artistId } = useParams();
  const songId = Array.isArray(id) ? id[0] : id;
  const artId = Array.isArray(artistId) ? artistId[0] : artistId;

  if (!songId || !artId) return null;

  return (
    <ArtistDetailContent
      id={artId}
      backHref={`/song/${songId}`}
      backLabel="Back to song"
    />
  );
}
