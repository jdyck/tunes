"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { supabase } from "@/lib/supabaseClient";
import { fetchRecordingDetail } from "@/lib/recordingMetadataClient";
import type {
  MusicBrainzReleaseSearchResult,
  ReleaseTracklistItem,
} from "@/lib/musicbrainz";
import type {
  YtMusicAlbumDetail,
  YtMusicAlbumSummary,
} from "@/lib/ytmusic";
import {
  matchAlbumTracks,
  type AlbumImportMatch,
  type AlbumImportSong,
} from "@/utils/albumImportMatching";

const failureLabels: Record<Exclude<AlbumImportMatch["state"], "ready">, string> = {
  "no-song": "Not in your Songs",
  "ambiguous-song": "Matches more than one Song",
  "no-recording": "Not found on the selected MusicBrainz release",
  "ambiguous-recording": "Multiple MusicBrainz recordings have the same title and duration",
};

export default function AlbumImportModal({
  songs,
  onClose,
  onImported,
}: {
  songs: AlbumImportSong[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<YtMusicAlbumSummary[]>([]);
  const [album, setAlbum] = useState<YtMusicAlbumDetail | null>(null);
  const [releases, setReleases] = useState<MusicBrainzReleaseSearchResult[]>([]);
  const [selectedRelease, setSelectedRelease] =
    useState<MusicBrainzReleaseSearchResult | null>(null);
  const [matches, setMatches] = useState<AlbumImportMatch[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const readyMatches = useMemo(
    () => matches.filter((match) => match.state === "ready"),
    [matches]
  );

  const searchAlbums = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAlbum(null);
    setSelectedRelease(null);
    setMatches([]);
    try {
      const response = await fetch(
        `/api/album-import/youtube/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error("Album search failed");
      const data = await response.json();
      setAlbums(data.albums ?? []);
    } catch {
      setError("Couldn't search YouTube Music albums.");
    }
    setLoading(false);
  };

  const chooseAlbum = async (summary: YtMusicAlbumSummary) => {
    setLoading(true);
    setError(null);
    setAlbums([]);
    try {
      const [albumResponse, releaseResponse] = await Promise.all([
        fetch(`/api/album-import/youtube/album/${summary.albumId}`),
        fetch(
          `/api/album-import/musicbrainz/releases?title=${encodeURIComponent(summary.name)}&artist=${encodeURIComponent(summary.artistName)}`
        ),
      ]);
      if (!albumResponse.ok || !releaseResponse.ok) {
        throw new Error("Album lookup failed");
      }
      const [albumData, releaseData] = await Promise.all([
        albumResponse.json(),
        releaseResponse.json(),
      ]);
      setAlbum(albumData.album);
      setReleases(releaseData.releases ?? []);
    } catch {
      setError("Couldn't load that album or its MusicBrainz releases.");
    }
    setLoading(false);
  };

  const chooseRelease = async (release: MusicBrainzReleaseSearchResult) => {
    if (!album) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/recording-metadata/release/${release.releaseId}`
      );
      if (!response.ok) throw new Error("Tracklist lookup failed");
      const data = (await response.json()) as { tracks: ReleaseTracklistItem[] };
      const nextMatches = matchAlbumTracks(album.tracks, data.tracks, songs);
      setSelectedRelease(release);
      setMatches(nextMatches);
      setSelectedVideoIds(
        new Set(
          nextMatches
            .filter((match) => match.state === "ready")
            .map((match) => match.mediaTrack.videoId)
        )
      );
    } catch {
      setError("Couldn't load that MusicBrainz tracklist.");
    }
    setLoading(false);
  };

  const importTracks = async () => {
    if (!album) return;
    const selected = readyMatches.filter((match) =>
      selectedVideoIds.has(match.mediaTrack.videoId)
    );
    setImporting(true);
    setError(null);

    for (let index = 0; index < selected.length; index += 1) {
      const match = selected[index];
      if (!match.song || !match.recording) continue;
      setProgress(`Importing ${index + 1} of ${selected.length}: ${match.mediaTrack.title}`);
      const { data: recordingId, error: saveError } = await supabase.rpc(
        "save_youtube_recording",
        {
          p_song_id: match.song.id,
          p_video_id: match.mediaTrack.videoId,
          p_title: match.mediaTrack.title,
          p_channel_name: match.mediaTrack.artistName,
          p_search_category: "song",
          p_discovery_source: "ytmusic_search",
          p_recording_kind: "released",
          p_ytmusic_artist_id: match.mediaTrack.artistId,
          p_ytmusic_artist_name: match.mediaTrack.artistName,
          p_ytmusic_album_id: album.albumId,
          p_ytmusic_album_name: album.name,
          p_duration_seconds: match.mediaTrack.durationSeconds,
          p_metadata_fetched_at: new Date().toISOString(),
        }
      );
      if (saveError || !recordingId) {
        setError(`Stopped at “${match.mediaTrack.title}”: ${saveError?.message ?? "save failed"}`);
        setImporting(false);
        return;
      }

      const detail = await fetchRecordingDetail(
        match.recording.recordingId,
        match.song.musicbrainzWorkId
      );
      if (!detail) {
        setError(`“${match.mediaTrack.title}” was saved, but MusicBrainz enrichment failed.`);
        setImporting(false);
        return;
      }
      const { error: updateError } = await supabase.rpc("update_saved_recording", {
        p_recording_id: recordingId,
        p_shared: {
          artist: detail.artistCredit || null,
          album: detail.releaseGroup?.title ?? null,
          duration: detail.duration,
          musicbrainz_recording_id: detail.recordingId,
          musicbrainz_release_id: detail.representativeReleaseId,
          recording_date_start: detail.recordingDateStart,
          recording_date_end: detail.recordingDateEnd,
          recording_location: detail.recordingLocation,
          release_group: detail.releaseGroup
            ? {
                title: detail.releaseGroup.title,
                musicbrainz_release_group_id:
                  detail.releaseGroup.musicbrainzReleaseGroupId,
              }
            : null,
          performers: detail.performers.map((performer) => ({
            name: performer.name,
            credited_as: performer.creditedAs,
            kind: performer.kind,
            musicbrainz_artist_id: performer.musicbrainzArtistId,
          })),
        },
        p_private: {},
      });
      if (updateError) {
        setError(`“${match.mediaTrack.title}” was saved, but enrichment could not be stored: ${updateError.message}`);
        setImporting(false);
        return;
      }
    }

    setImporting(false);
    setProgress(`Imported ${selected.length} Recording${selected.length === 1 ? "" : "s"}.`);
    onImported();
  };

  return (
    <Modal title="Import an Album" onClose={onClose}>
      <p className="mb-3 text-sm text-ink-600">
        Only tracks matching Songs already in your repertoire can be imported.
      </p>
      {error && <p className="mb-3 text-sm text-vermillion-600">{error}</p>}
      {!album && (
        <div className="mb-4 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchAlbums();
              }
            }}
            placeholder="Album and artist"
            className="min-w-0 flex-1 rounded-md border border-paper-600 p-2"
          />
          <PrimaryButton onClick={searchAlbums} disabled={loading || !query.trim()}>
            Search
          </PrimaryButton>
        </div>
      )}

      {albums.length > 0 && (
        <ul className="mb-4 divide-y divide-paper-600 rounded-md border border-paper-600">
          {albums.map((result) => (
            <li key={result.albumId}>
              <button
                type="button"
                data-album-id={result.albumId}
                onClick={() => chooseAlbum(result)}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-paper-100"
              >
                <RecordingThumbnail src={result.thumbnail} className="h-12 w-12 rounded" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{result.name}</span>
                  <span className="block truncate text-xs text-ink-600">
                    {[result.artistName, result.year].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {album && !selectedRelease && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <RecordingThumbnail src={album.thumbnail} className="h-14 w-14 rounded" />
            <div>
              <p className="font-semibold">{album.name}</p>
              <p className="text-xs text-ink-600">{album.artistName}</p>
            </div>
          </div>
          <p className="mb-2 text-sm font-semibold">Choose the matching MusicBrainz release</p>
          <ul className="mb-4 max-h-72 overflow-y-auto divide-y divide-paper-600 rounded-md border border-paper-600">
            {releases.map((release) => (
              <li key={release.releaseId}>
                <button
                  type="button"
                  data-release-id={release.releaseId}
                  onClick={() => chooseRelease(release)}
                  className="block w-full p-3 text-left hover:bg-paper-100"
                >
                  <span className="block font-medium">{release.title}</span>
                  <span className="block text-xs text-ink-600">
                    {[release.artistCredit, release.date, release.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {matches.length > 0 && (
        <>
          <ul className="mb-4 max-h-80 overflow-y-auto divide-y divide-paper-600 rounded-md border border-paper-600">
            {matches.map((match) => (
              <li key={match.mediaTrack.videoId} className="flex gap-3 p-3">
                <input
                  type="checkbox"
                  checked={selectedVideoIds.has(match.mediaTrack.videoId)}
                  disabled={match.state !== "ready" || importing}
                  onChange={(event) => {
                    setSelectedVideoIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(match.mediaTrack.videoId);
                      else next.delete(match.mediaTrack.videoId);
                      return next;
                    });
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{match.mediaTrack.title}</p>
                  <p className="text-xs text-ink-600">
                    {match.state === "ready"
                      ? `→ ${match.song?.title}`
                      : failureLabels[match.state]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <PrimaryButton
            onClick={importTracks}
            disabled={importing || selectedVideoIds.size === 0}
            className="w-full p-3 disabled:opacity-60"
          >
            {importing ? progress : `Import ${selectedVideoIds.size} Recording${selectedVideoIds.size === 1 ? "" : "s"}`}
          </PrimaryButton>
        </>
      )}
      {loading && <p className="text-sm text-ink-600">Loading…</p>}
      {!importing && progress && <p className="mt-3 text-sm text-azure-900">{progress}</p>}
    </Modal>
  );
}
