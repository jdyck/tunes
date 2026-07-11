"use client";

import { useParams, useRouter } from "next/navigation";
import RecordingDetailContent from "@/components/RecordingDetailContent";

export default function RecordingDetailPage() {
  const { id, recordingId } = useParams();
  const router = useRouter();
  const songId = Array.isArray(id) ? id[0] : id;
  const recId = Array.isArray(recordingId) ? recordingId[0] : recordingId;

  if (!songId || !recId) return null;

  return (
    <RecordingDetailContent
      id={recId}
      songId={songId}
      onClose={() => router.push(`/song/${songId}`)}
    />
  );
}
