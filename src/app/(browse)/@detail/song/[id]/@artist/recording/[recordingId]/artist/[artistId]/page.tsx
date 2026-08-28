"use client";

import { useParams } from "next/navigation";
import ArtistDetailContent from "@/components/artist/ArtistDetailContent";

export default function SongRecordingArtistPanelPage() {
  const { id, recordingId, artistId } = useParams();
  const songId = Array.isArray(id) ? id[0] : id;
  const recId = Array.isArray(recordingId) ? recordingId[0] : recordingId;
  const artId = Array.isArray(artistId) ? artistId[0] : artistId;

  if (!songId || !recId || !artId) return null;

  return (
    <ArtistDetailContent
      id={artId}
      backHref={`/song/${songId}/recording/${recId}`}
      backLabel="Back to recording"
    />
  );
}
