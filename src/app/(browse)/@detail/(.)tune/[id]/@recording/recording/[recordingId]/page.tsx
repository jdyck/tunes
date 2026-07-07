"use client";

import { useParams, useRouter } from "next/navigation";
import RecordingDetailContent from "@/components/RecordingDetailContent";

export default function InterceptedRecordingDetail() {
  const { id, recordingId } = useParams();
  const router = useRouter();
  const tuneId = Array.isArray(id) ? id[0] : id;
  const recId = Array.isArray(recordingId) ? recordingId[0] : recordingId;

  if (!tuneId || !recId) return null;

  return (
    <RecordingDetailContent
      id={recId}
      onClose={() => router.push(`/tune/${tuneId}`)}
    />
  );
}
