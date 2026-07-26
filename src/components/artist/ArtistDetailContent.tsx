"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  PlayIcon,
} from "@heroicons/react/20/solid";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { useSongsList } from "@/components/song/SongsListContext";
import { usePlayer } from "@/components/player/GlobalPlayer";
import { useArtistRecordings } from "@/hooks/useArtistRecordings";
import RecordingListRow from "@/components/recording/RecordingListRow";
import AsyncStateMessage from "@/components/ui/AsyncStateMessage";
import PaneHeader from "@/components/layout/PaneHeader";
import { ArtistKind } from "@/types/types";
import { effectiveSongTitle } from "@/utils/songTitle";
import { formatWriterCredit } from "@/lib/songWriters";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";

const kindLabels: Record<ArtistKind, string> = {
  person: "Person",
  group: "Group",
  orchestra: "Orchestra",
  choir: "Choir",
  character: "Character",
  other: "Other",
};

export default function ArtistDetailContent({ id }: { id: string }) {
  const { songs, loading: songsLoading } = useSongsList();
  const { play } = usePlayer();

  // An artist credited as a writer is already present in the loaded Songs and
  // their credits — no extra query. Performer-only artists (no writer credit)
  // are resolved from the recordings query below instead.
  const writerArtist = useMemo(() => {
    for (const song of songs) {
      const credit = (song.song_artist_credits ?? []).find(
        (c) => c.artists?.id === id
      );
      if (credit?.artists) return credit.artists;
    }
    return null;
  }, [songs, id]);

  const artistSongs = useMemo(
    () =>
      songs
        .filter((song) =>
          (song.song_artist_credits ?? []).some((c) => c.artists?.id === id)
        )
        .map((song) => ({
          id: song.id,
          title: effectiveSongTitle(song, song.user_data),
          year: song.year,
          credit: formatWriterCredit(song.song_artist_credits ?? []),
        })),
    [songs, id]
  );

  const songTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const song of songs) {
      map.set(song.id, effectiveSongTitle(song, song.user_data));
    }
    return map;
  }, [songs]);

  const {
    recordings,
    artist: performerArtist,
    loading: recordingsLoading,
    error: recordingsError,
  } = useArtistRecordings(id);

  const artist = writerArtist ?? performerArtist;

  if ((songsLoading || recordingsLoading) && !artist) {
    return <AsyncStateMessage>Loading artist...</AsyncStateMessage>;
  }

  if (!artist) {
    return <AsyncStateMessage>No artist found.</AsyncStateMessage>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-surface-app">
      <PaneHeader backHref="/artists" backLabel="Back to artists" safeAreaTop>
        <div className="pb-8">
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
              className="mt-2 block text-xs text-teal-700 underline"
            />
          )}
        </div>
      </PaneHeader>

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-2 max-w-xl">
            <h3
              className={`text-mojo-700 text-2xl tracking-wide uppercase ${leagueGothic.className}`}
            >
              Songs
            </h3>
            <span
              className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-mojo-700 text-white text-xs ${robotoCondensed.className}`}
            >
              {artistSongs.length}
            </span>
          </div>

          {artistSongs.length > 0 ? (
            <ul>
              {artistSongs.map((song) => (
                <li
                  key={song.id}
                  className="[&:has(+_li:hover)>a]:border-transparent"
                >
                  <Link
                    href={`/song/${song.id}`}
                    className={`flex items-center justify-between gap-2 border-b border-border-default p-4 pl-0 hover:bg-old-lace-100 hover:border-transparent hover:rounded-lg active:bg-old-lace-100 ${robotoCondensed.className}`}
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
          ) : (
            <p>No songs credit this artist.</p>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2 max-w-xl">
            <h3
              className={`text-mojo-700 text-2xl tracking-wide uppercase ${leagueGothic.className}`}
            >
              Recordings
            </h3>
            <span
              className={`inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-mojo-700 text-white text-xs ${robotoCondensed.className}`}
            >
              {recordings.length}
            </span>
          </div>

          {recordingsError && (
            <p className="mb-3 text-sm text-mojo-600">{recordingsError}</p>
          )}

          {recordingsLoading ? (
            <p className="text-ink-600">Loading recordings...</p>
          ) : recordings.length > 0 ? (
            <ul>
              {recordings.map((recording) => {
                const youtubeItem = recording.youtube_items[0];
                const songTitle =
                  songTitleById.get(recording.song_id) ?? recording.name;
                return (
                  <li
                    key={recording.id}
                    className="flex items-stretch border-b border-border-default hover:border-transparent hover:bg-merino-200 active:bg-merino-300 [&:has(+_li:hover)]:border-transparent"
                  >
                    <Link
                      href={`/song/${recording.song_id}/recording/${recording.id}`}
                      className="flex flex-1 min-w-0 flex-col justify-center"
                    >
                      <span
                        className={`${leagueGothic.className} uppercase text-sm tracking-wide text-azure-600 pl-4 pt-2`}
                      >
                        {songTitle}
                      </span>
                      <RecordingListRow recording={recording} />
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
                        className="p-3 text-green-800 hover:text-green-900 shrink-0 self-center"
                      >
                        <PlayIcon className="w-6 h-6" />
                      </button>
                    )}
                    <Link
                      href={`/song/${recording.song_id}/recording/${recording.id}`}
                      aria-label="Open recording details"
                      className="p-3 text-ink-700 hover:text-ink-900 shrink-0 self-center"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No saved recordings credit this artist.</p>
          )}
        </section>
      </div>
    </div>
  );
}
