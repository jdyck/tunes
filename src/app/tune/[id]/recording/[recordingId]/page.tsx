"use client";

import { useParams, useRouter } from "next/navigation";
import RecordingDetailContent from "@/components/RecordingDetailContent";

export default function RecordingPage() {
  const { recordingId } = useParams();
  const router = useRouter();
  const id = Array.isArray(recordingId) ? recordingId[0] : recordingId;

  if (!id) return null;

  return (
    <div className="w-full">
      <RecordingDetailContent id={id} />
      <button
        onClick={() => router.back()}
        className="mt-2 w-full px-4 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700"
      >
        Go Back
      </button>
    </div>
  );
}
