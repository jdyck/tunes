"use client";

import { useParams } from "next/navigation";
import SongDetailContent from "@/components/song/SongDetailContent";

export default function ArtistSongPanelPage() {
  const { id, songId } = useParams();
  const artistId = Array.isArray(id) ? id[0] : id;
  const sId = Array.isArray(songId) ? songId[0] : songId;

  if (!artistId || !sId) return null;

  return (
    <SongDetailContent
      id={sId}
      backHref={`/artist/${artistId}`}
      backLabel="Back to artist"
      basePath={`/artist/${artistId}/song/${sId}`}
    />
  );
}
