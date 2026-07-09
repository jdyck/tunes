"use client";

import { useParams } from "next/navigation";
import SongDetailContent from "@/components/SongDetailContent";
import RecordingPaneWrapper from "@/components/RecordingPaneWrapper";

export default function TuneDetailLayout({
  children,
  recording,
}: {
  children: React.ReactNode;
  recording?: React.ReactNode;
}) {
  const { id } = useParams();
  const tuneId = Array.isArray(id) ? id[0] : id;

  if (!tuneId) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-16 bottom-0 z-20 overflow-y-auto pb-16 bg-slate-100 lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:h-full lg:overflow-y-auto lg:pb-0 lg:border-r lg:border-slate-200">
        <SongDetailContent id={tuneId} />
        {children}
      </div>
      <RecordingPaneWrapper>{recording}</RecordingPaneWrapper>
    </>
  );
}
