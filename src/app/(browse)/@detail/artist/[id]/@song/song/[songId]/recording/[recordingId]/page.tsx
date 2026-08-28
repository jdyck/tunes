"use client";

import { useParams } from "next/navigation";
import SongDetailContent from "@/components/song/SongDetailContent";

// Renders the same Song panel as the 2-deep case; the @song slot still needs
// a resolver for the deeper path once a Recording is appended, since Next
// requires every active named slot to resolve against the full remaining
// pathname (see the @recording/.../artist duplicate pages under song/[id]
// for the mirror-image case).
export default function ArtistSongPanelWithRecordingPage() {
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
