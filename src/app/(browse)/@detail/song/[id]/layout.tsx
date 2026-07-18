"use client";

import { useParams } from "next/navigation";
import SongDetailContent from "@/components/song/SongDetailContent";
import RecordingPaneGate from "@/components/layout/RecordingPaneGate";

export default function SongDetailLayout({
  children,
  recording,
}: {
  children: React.ReactNode;
  recording?: React.ReactNode;
}) {
  const { id } = useParams();
  const songId = Array.isArray(id) ? id[0] : id;

  if (!songId) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 bottom-0 z-20 overscroll-none bg-surface-app lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:min-w-[500px] lg:h-full lg:border-r lg:border-line-100">
        <SongDetailContent id={songId} />
        {children}
      </div>
      <RecordingPaneGate>{recording}</RecordingPaneGate>
    </>
  );
}
