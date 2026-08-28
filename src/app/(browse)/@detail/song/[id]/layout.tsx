"use client";

import { useParams } from "next/navigation";
import SongDetailContent from "@/components/song/SongDetailContent";
import NestedPaneGate from "@/components/layout/NestedPaneGate";

export default function SongDetailLayout({
  children,
  recording,
  artist,
}: {
  children: React.ReactNode;
  recording?: React.ReactNode;
  artist?: React.ReactNode;
}) {
  const { id } = useParams();
  const songId = Array.isArray(id) ? id[0] : id;

  if (!songId) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 bottom-0 z-[var(--layer-browse-detail)] overscroll-none bg-surface-app lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:min-w-[500px] lg:h-full lg:border-r lg:border-paper-600">
        <SongDetailContent id={songId} />
        {children}
      </div>
      <NestedPaneGate
        matchPattern={/\/recording\//}
        zLayerClassName="z-[var(--layer-recording-detail)]"
      >
        {recording}
      </NestedPaneGate>
      <NestedPaneGate
        matchPattern={/\/artist\//}
        zLayerClassName="z-[var(--layer-nested-detail-3)]"
        neverStatic
      >
        {artist}
      </NestedPaneGate>
    </>
  );
}
