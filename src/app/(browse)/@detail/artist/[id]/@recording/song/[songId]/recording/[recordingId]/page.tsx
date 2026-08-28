"use client";

import { useParams } from "next/navigation";
import RecordingDetailContent from "@/components/recording/RecordingDetailContent";

export default function ArtistRecordingPanelPage() {
  const { id, songId, recordingId } = useParams();
  const artistId = Array.isArray(id) ? id[0] : id;
  const sId = Array.isArray(songId) ? songId[0] : songId;
  const recId = Array.isArray(recordingId) ? recordingId[0] : recordingId;

  if (!artistId || !sId || !recId) return null;

  return (
    <RecordingDetailContent
      id={recId}
      songId={sId}
      backHref={`/artist/${artistId}/song/${sId}`}
    />
  );
}
