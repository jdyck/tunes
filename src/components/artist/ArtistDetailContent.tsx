"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRightIcon, PlayIcon } from "@heroicons/react/20/solid";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { usePlayer } from "@/components/player/GlobalPlayer";
import RecordingListRow from "@/components/recording/RecordingListRow";
import AsyncStateMessage from "@/components/ui/AsyncStateMessage";
import PaneHeader from "@/components/layout/PaneHeader";
import type { ArtistKind } from "@/types/types";
import { formatArtistRecordingRelationshipReasons } from "@/utils/artistRecordingRelationship";
import { effectiveSongTitle } from "@/utils/songTitle";
import { formatWriterCredit } from "@/lib/songWriters";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";
import { useArtistDetail } from "@/hooks/useArtistDetail";
import ArtistMemberships from "./ArtistMemberships";

const kindLabels: Record<ArtistKind, string> = {
  person: "Person",
  group: "Group",
  orchestra: "Orchestra",
  choir: "Choir",
  character: "Character",
  other: "Other",
};

export default function ArtistDetailContent({
  id,
  backHref = "/artists",
  backLabel = "Back to artists",
}: {
  id: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { play } = usePlayer();
  const {
    artist,
    songs,
    recordings,
    songCount,
    recordingCount,
    songStatus,
    recordingStatus,
    loadMoreSongs,
    loadMoreRecordings,
    loading,
  } = useArtistDetail(id);

  const artistSongs = useMemo(
    () =>
      songs.map((song) => ({
        id: song.id,
        title: effectiveSongTitle(song, song.user_data),
        year: song.year,
        credit: formatWriterCredit(song.song_artist_credits ?? []),
      })),
    [songs],
  );

  if (loading && !artist) {
    return <AsyncStateMessage>Loading artist...</AsyncStateMessage>;
  }

  if (!artist) {
    return <AsyncStateMessage>No artist found.</AsyncStateMessage>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-surface-app">
      <PaneHeader backHref={backHref} backLabel={backLabel} safeAreaTop>
        <div className="flex items-start gap-4 pb-8">
          <div className="min-w-0 flex-1">
            <h1
              className={`text-6xl uppercase leading-14 ${leagueGothic.className} tracking-wide mb-2 wrap-break-word`}
            >
              {artist.name}
            </h1>
            {artist.kind && (
              <p
                className={`text-ink-600 ${robotoCondensed.className} tracking-wide`}
              >
                {kindLabels[artist.kind]}
              </p>
            )}
            {artist.musicbrainz_artist_id && (
              <MusicBrainzLink
                type="artist"
                id={artist.musicbrainz_artist_id}
                className="mt-2 block text-xs text-azure-600 underline"
              />
            )}
          </div>
          {artist.image_url && (
            <div className="flex w-36 shrink-0 flex-col items-end">
              <img
                src={artist.image_url}
                alt={artist.name}
                className="h-auto max-h-52 max-w-full rounded-md object-contain"
              />
              {artist.image_source_url && (
                <a
                  href={artist.image_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-right text-xs text-azure-600 underline"
                >
                  Image source
                  {artist.image_license ? ` · ${artist.image_license}` : ""}
                </a>
              )}
            </div>
          )}
        </div>
      </PaneHeader>

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <ArtistMemberships key={id} artistId={id} />
        {songCount > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-2 max-w-xl">
              <h3
                className={`text-vermillion-700 text-2xl tracking-wide uppercase ${leagueGothic.className}`}
              >
                Songs
              </h3>
              <span
                className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-vermillion-700 text-white text-xs ${robotoCondensed.className}`}
              >
                {songCount}
              </span>
            </div>

            <ul>
              {artistSongs.map((song) => (
                <li
                  key={song.id}
                  className="[&:has(+_li:hover)>a]:border-transparent"
                >
                  <Link
                    href={`/artist/${id}/song/${song.id}`}
                    className={`flex items-center justify-between gap-2 border-b border-border-default p-4 pl-0 hover:bg-paper-100 hover:border-transparent hover:rounded-lg active:bg-paper-100 ${robotoCondensed.className}`}
                  >
                    <span className="min-w-0">
                      <span
                        className={`block ${leagueGothic.className} uppercase text-xl tracking-wide truncate`}
                      >
                        {song.title}
                      </span>
                      {song.credit && (
                        <span className="block text-sm tracking-wide text-ink-600 truncate">
                          {song.credit}
                        </span>
                      )}
                    </span>
                    {song.year && (
                      <span className="text-sm text-ink-900 shrink-0">
                        {song.year}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            {songStatus === "LoadingFirstPage" && (
              <AsyncStateMessage>Loading Songs...</AsyncStateMessage>
            )}
            {songStatus === "CanLoadMore" && (
              <button
                type="button"
                onClick={() => loadMoreSongs(25)}
                className="mt-3 rounded-sm px-3 py-2 font-semibold text-azure-700 hover:bg-paper-100"
              >
                Load more Songs
              </button>
            )}
            {songStatus === "LoadingMore" && (
              <p className="mt-3 text-sm text-ink-600">Loading more Songs...</p>
            )}
          </section>
        )}

        {recordingCount > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2 max-w-xl">
              <h3
                className={`text-vermillion-700 text-2xl tracking-wide uppercase ${leagueGothic.className}`}
              >
                Recordings
              </h3>
              <span
                className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-vermillion-700 text-white text-xs ${robotoCondensed.className}`}
              >
                {recordingCount}
              </span>
            </div>

            <ul>
              {recordings.map((recording) => {
                const youtubeItem = recording.youtube_items[0];
                const songTitle = recording.song_title;
                const relationshipReasons =
                  formatArtistRecordingRelationshipReasons(
                    recording.relationship_reasons,
                    recording.release_groups?.title,
                  );
                return (
                  <li
                    key={recording.id}
                    className="flex items-stretch border-b border-border-default hover:border-transparent hover:bg-paper-200 active:bg-paper-300 [&:has(+_li:hover)]:border-transparent"
                  >
                    <Link
                      href={`/artist/${id}/song/${recording.song_id}/recording/${recording.id}`}
                      className="flex flex-1 min-w-0 flex-col justify-center"
                    >
                      <span
                        className={`${leagueGothic.className} uppercase text-sm tracking-wide text-azure-600 pl-4 pt-2`}
                      >
                        {songTitle}
                      </span>
                      <RecordingListRow recording={recording} />
                      {relationshipReasons && (
                        <span className="pb-2 pl-4 text-xs tracking-wide text-ink-600">
                          Related through {relationshipReasons}
                        </span>
                      )}
                    </Link>
                    {youtubeItem && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          play({
                            name: recording.name,
                            songTitle,
                            artist: recording.artist,
                            kind: recording.kind,
                            youtubeVideoId: youtubeItem.video_id,
                          });
                        }}
                        aria-label="Play recording"
                        className="p-3 text-ink-700 hover:text-action shrink-0 self-center"
                      >
                        <PlayIcon className="w-6 h-6" />
                      </button>
                    )}
                    <Link
                      href={`/artist/${id}/song/${recording.song_id}/recording/${recording.id}`}
                      aria-label="Open recording details"
                      className="p-3 text-ink-700 hover:text-ink-900 shrink-0 self-center"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {recordingStatus === "LoadingFirstPage" && (
              <AsyncStateMessage>Loading Recordings...</AsyncStateMessage>
            )}
            {recordingStatus === "CanLoadMore" && (
              <button
                type="button"
                onClick={() => loadMoreRecordings(25)}
                className="mt-3 rounded-sm px-3 py-2 font-semibold text-azure-700 hover:bg-paper-100"
              >
                Load more Recordings
              </button>
            )}
            {recordingStatus === "LoadingMore" && (
              <p className="mt-3 text-sm text-ink-600">
                Loading more Recordings...
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
