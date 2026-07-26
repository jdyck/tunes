"use client";

import { useParams } from "next/navigation";
import ArtistDetailContent from "@/components/artist/ArtistDetailContent";

export default function ArtistDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams();
  const artistId = Array.isArray(id) ? id[0] : id;

  if (!artistId) return null;

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-[var(--layer-browse-detail)] overscroll-none bg-surface-app lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:min-w-[500px] lg:h-full lg:border-r lg:border-line-100">
      <ArtistDetailContent id={artistId} />
      {children}
    </div>
  );
}
