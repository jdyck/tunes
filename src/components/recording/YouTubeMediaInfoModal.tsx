"use client";

import Modal from "@/components/ui/Modal";
import { formatDurationSeconds } from "@/lib/youtube";
import type {
  RecordingYouTubeItem,
  YouTubeDiscoverySource,
} from "@/types/types";

const discoverySourceLabels: Record<YouTubeDiscoverySource, string> = {
  ytmusic_search: "YouTube Music search",
  youtube_search: "YouTube search",
  manual_url: "Manual URL",
  legacy_recording_url: "Legacy Recording URL",
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b border-paper-600 py-2 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-600">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm text-ink-900">{value}</dd>
    </div>
  );
}

export default function YouTubeMediaInfoModal({
  items,
  onClose,
}: {
  items: RecordingYouTubeItem[];
  onClose: () => void;
}) {
  return (
    <Modal title="YouTube media info" onClose={onClose}>
      <p className="mb-4 text-sm text-ink-600">
        Stored provider metadata for this Recording. These fields describe the
        linked YouTube media, not the canonical Recording.
      </p>

      <div className="space-y-5">
        {items.map((item, index) => (
          <section
            key={item.video_id}
            className="rounded-md border border-paper-600 p-3"
          >
            {items.length > 1 && (
              <h3 className="mb-2 font-semibold">Media {index + 1}</h3>
            )}
            <dl>
              <InfoRow label="Title" value={item.title} />
              <InfoRow label="Channel" value={item.channel_name || "Unknown"} />
              <InfoRow
                label="Category"
                value={item.search_category === "song" ? "Song" : "Video"}
              />
              <InfoRow
                label="Found via"
                value={
                  item.discovery_sources.length > 0
                    ? item.discovery_sources
                        .map((source) => discoverySourceLabels[source])
                        .join(", ")
                    : "Unknown"
                }
              />
              <InfoRow
                label="Duration"
                value={
                  item.duration_seconds == null
                    ? "Unknown"
                    : formatDurationSeconds(item.duration_seconds)
                }
              />
              <InfoRow
                label="Video"
                value={
                  <a
                    href={`https://www.youtube.com/watch?v=${item.video_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-azure-900 underline"
                  >
                    {item.video_id}
                  </a>
                }
              />
              <InfoRow
                label="YT Music artist"
                value={
                  item.ytmusic_artist_id ? (
                    <a
                      href={`https://music.youtube.com/channel/${item.ytmusic_artist_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-azure-900 underline"
                    >
                      {item.ytmusic_artist_name || item.ytmusic_artist_id}
                    </a>
                  ) : (
                    item.ytmusic_artist_name || "Unknown"
                  )
                }
              />
              <InfoRow
                label="YT Music album"
                value={
                  item.ytmusic_album_id ? (
                    <a
                      href={`https://music.youtube.com/browse/${item.ytmusic_album_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-azure-900 underline"
                    >
                      {item.ytmusic_album_name || item.ytmusic_album_id}
                    </a>
                  ) : (
                    item.ytmusic_album_name || "Unknown"
                  )
                }
              />
              <InfoRow
                label="Metadata fetched"
                value={formatTimestamp(item.metadata_fetched_at)}
              />
              <InfoRow
                label="Linked"
                value={formatTimestamp(item.association_created_at)}
              />
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
