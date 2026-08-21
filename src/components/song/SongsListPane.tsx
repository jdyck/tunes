"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import AddSongModal from "@/components/song/AddSongModal";
import { PlusIcon } from "@heroicons/react/24/solid";
import { formatWriterCredit } from "@/lib/songWriters";
import { useSongsList } from "@/components/song/SongsListContext";
import { SongWithUserData } from "@/types/types";
import PaneHeader from "@/components/layout/PaneHeader";
import { effectiveSongTitle } from "@/utils/songTitle";
import Modal from "@/components/ui/Modal";
import { useSessionState } from "@/hooks/useSessionState";
import {
  defaultExcludeHoliday,
  matchesSongFilters,
  projectedFavoriteCount,
  projectedTagCount,
  SongFilters,
} from "@/utils/songFilters";
import { collectTags, hasTag, tagKey } from "@/utils/songTags";
import { useSongArtwork } from "@/hooks/useSongArtwork";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import type { RecordingArtwork } from "@/utils/recordingArtwork";

type SortKey = "title" | "writers" | "date" | "added";
type SortDirection = "asc" | "desc";

// How many rows are added each time the list grows. The whole library is
// already in memory -- search, sorting, and the tag facet counts all need it --
// so this windows the *rendering* only, which is what keeps a large library
// from mounting hundreds of rows and firing a cover-art request for each.
const songsPerPage = 50;

interface SongsListState extends SongFilters {
  search: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

const initialSongsListState = (): SongsListState => ({
  search: "",
  sortKey: "added",
  sortDirection: "desc",
  favoriteOnly: false,
  includedTags: [],
  excludeHoliday: defaultExcludeHoliday(new Date()),
});

const isSongsListState = (value: unknown): value is SongsListState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SongsListState>;
  return (
    typeof state.search === "string" &&
    ["title", "writers", "date", "added"].includes(state.sortKey ?? "") &&
    ["asc", "desc"].includes(state.sortDirection ?? "") &&
    typeof state.favoriteOnly === "boolean" &&
    Array.isArray(state.includedTags) &&
    state.includedTags.every((tag) => typeof tag === "string") &&
    typeof state.excludeHoliday === "boolean"
  );
};

const sortLabels: Record<SortKey, string> = {
  title: "Title",
  writers: "Writers",
  date: "Date",
  added: "Added",
};

const titleForSorting = (title: string) => {
  const filingTitle = title
    .trim()
    .replace(/^(?:\([^)]*\)\s*)+/, "")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();

  return filingTitle || title;
};

export default function SongsListPane() {
  const router = useRouter();
  const pathname = usePathname();
  const { songs, loading, error } = useSongsList();

  const [listState, setListState] = useSessionState(
    "standards:songs-list-state",
    initialSongsListState,
    isSongsListState
  );
  const { search, sortKey, sortDirection, favoriteOnly, includedTags, excludeHoliday } = listState;
  const [showAddSong, setShowAddSong] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(songsPerPage);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const artworkBySong = useSongArtwork();

  const goToSong = (id: string) => {
    router.push(`/song/${id}`);
  };

  const searchMatchedSongs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return searchTerm
      ? songs.filter((song) => {
          const effectiveTitle = effectiveSongTitle(song, song.user_data);
          const writerCredit =
            formatWriterCredit(song.song_artist_credits ?? []) ?? "";
          return (
            effectiveTitle.toLowerCase().includes(searchTerm) ||
            song.name.toLowerCase().includes(searchTerm) ||
            writerCredit.toLowerCase().includes(searchTerm)
          );
        })
      : songs;
  }, [search, songs]);

  const filters = useMemo<SongFilters>(
    () => ({ favoriteOnly, includedTags, excludeHoliday }),
    [excludeHoliday, favoriteOnly, includedTags]
  );

  const visibleSongs = useMemo(() => {
    const filteredSongs = searchMatchedSongs.filter((song) =>
      matchesSongFilters(song, filters)
    );

    return [...filteredSongs].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "title") {
        const aTitle = effectiveSongTitle(a, a.user_data);
        const bTitle = effectiveSongTitle(b, b.user_data);
        comparison =
          titleForSorting(aTitle).localeCompare(titleForSorting(bTitle)) ||
          aTitle.localeCompare(bTitle);
      } else if (sortKey === "writers") {
        comparison = (
          formatWriterCredit(a.song_artist_credits ?? []) ?? ""
        ).localeCompare(formatWriterCredit(b.song_artist_credits ?? []) ?? "");
      } else if (sortKey === "date") {
        comparison = String(a.year ?? "").localeCompare(String(b.year ?? ""));
      } else {
        comparison = String(a.user_data.created_at).localeCompare(
          String(b.user_data.created_at)
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filters, searchMatchedSongs, sortDirection, sortKey]);

  const renderedSongs = visibleSongs.slice(0, visibleCount);
  const hasMoreSongs = visibleCount < visibleSongs.length;

  // Searching, sorting, or filtering produces a different list, so the window
  // starts over rather than stranding the User partway down the previous one.
  useEffect(() => {
    setVisibleCount(songsPerPage);
  }, [listState]);

  useEffect(() => {
    if (!hasMoreSongs) return;
    const sentinel = loadMoreRef.current;
    const scrollContainer = scrollRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => count + songsPerPage);
        }
      },
      // Grow before the sentinel is actually reached, so the list extends
      // during the scroll instead of after it stops.
      { root: scrollContainer, rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
    // Re-creating the observer on `visibleCount` is deliberate: an observer
    // reports intersection *changes*, so on a viewport tall enough that the
    // sentinel stays in view after a page is added, only a fresh observer
    // reports it again and lets the window keep growing.
  }, [hasMoreSongs, visibleCount]);

  const allTags = useMemo(
    () => collectTags(songs.map((song) => song.user_data.tags)),
    [songs]
  );
  const facetTags = useMemo(
    () =>
      allTags
        .map((tag) => ({
          tag,
          selected: includedTags.some((item) => tagKey(item) === tagKey(tag)),
          count: projectedTagCount(searchMatchedSongs, filters, tag),
        }))
        .filter(({ tag, selected, count }) => {
          if (excludeHoliday && hasTag([tag], "Holiday")) return false;
          return selected || count > 0;
        }),
    [allTags, excludeHoliday, filters, includedTags, searchMatchedSongs]
  );
  const favoriteCount = projectedFavoriteCount(searchMatchedSongs, filters);
  const excludeHolidayCount = searchMatchedSongs.filter((song) =>
    matchesSongFilters(song, { ...filters, excludeHoliday: true })
  ).length;
  const filterCount = includedTags.length + Number(favoriteOnly);
  const hasActiveFilters = filterCount > 0 || excludeHoliday;

  return (
    <div className="w-full h-full flex flex-col">
      <PaneHeader backHref="/" backLabel="Back">
        <div className="flex items-center justify-between pb-2">
          <h1 className={`text-7xl uppercase tracking-wide px-4 ${leagueGothic.className}`}>
            Songs
          </h1>
          <button
            onClick={() => setShowAddSong(true)}
            aria-label="Add song"
            className={`border-[2] border-vermillion-600 text-vermillion-600 p-2 py-1.75 rounded-sm tracking-widest uppercase flex font-medium items-center gap-1 ${robotoCondensed.className}`}
          >
            <PlusIcon className="h-5 w-5 " />
            <span>Add</span>
          </button>
        </div>
        <div className="flex gap-2 pb-2">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="h-4 w-4 text-ink-700 absolute left-3 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                type="button"
                onClick={() => setListState((state) => ({ ...state, search: "" }))}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-600 hover:bg-paper-200 hover:text-ink-900"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setListState((state) => ({ ...state, search: e.target.value }))}
              placeholder="Search songs, composers, lyricists..."
              className="w-full pl-9 pr-9 py-2 rounded-sm border-[1.5] border-ink-400 bg-surface-app"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-sm border-[1.5]  border-ink-400 px-2.5 py-2 font-semibold ${
              hasActiveFilters
                ? "border-azure-600 text-azure-600"
                : "border-ink-400 text-ink-800"
            }`}
            aria-label={`Filter songs${
              filterCount
                ? `, ${filterCount} selected`
                : excludeHoliday
                  ? ", filters active"
                  : ""
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            {filterCount > 0 && <span aria-hidden="true">{filterCount}</span>}
          </button>
        </div>


        <div className="pb-4 text-sm text-ink-600 flex items-center justify-between gap-3 px-4 ">
          <span className={`text-azure-600 font-bold uppercase ${leagueGothic.className} text-base tracking-widest`}>{visibleSongs.length} Songs</span>
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowSortMenu((open) => !open)}
              className="px-2 py-1 rounded-sm font-semibold text-ink-800 hover:bg-paper-200"
              aria-haspopup="menu"
              aria-expanded={showSortMenu}
            >
              {sortLabels[sortKey]}
            </button>
            <button
              type="button"
              onClick={() =>
                setListState((state) => ({
                  ...state,
                  sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
                }))
              }
              className="p-1 rounded-sm text-ink-800 hover:bg-paper-200"
              aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
            >
              {sortDirection === "asc" ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
            {showSortMenu && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-24 rounded-md border border-paper-600 bg-surface-app py-1 shadow-md"
              >
                {(["title", "writers", "date", "added"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setListState((state) => ({ ...state, sortKey: key }));
                      setShowSortMenu(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-paper-100 ${
                      sortKey === key ? "font-semibold text-ink-900" : ""
                    }`}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </PaneHeader>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-none p-4 pb-12"
      >
        {loading ? (
          <SongsListSkeleton />
        ) : error ? (
          <p className="text-vermillion-600">{error}</p>
        ) : visibleSongs.length > 0 ? (
          <>
            <ul>
              {renderedSongs.map((song) => {
                const isActive = pathname.startsWith(`/song/${song.id}`);
                return (
                  <li key={song.id} className="[&:has(+_li:hover)>a]:border-transparent">
                    <Link
                      href={`/song/${song.id}`}
                      className={`relative flex items-center gap-3 border-b border-border-default h-20 p-6 pl-0 hover:bg-paper-100 hover:border-transparent hover:rounded-lg active:bg-paper-100 ${
                        isActive ? "bg-paper-100" : ""
                      }`}
                    >
                      <SongRow song={song} artwork={artworkBySong.get(song.id)} />
                      {isActive && (
                        <div className="w-2 h-full absolute bg-vermillion-700 shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {hasMoreSongs && (
              <div ref={loadMoreRef} aria-hidden="true" className="h-1" />
            )}
          </>
        ) : songs.length > 0 ? (
          <p>No songs match “{search}”.</p>
        ) : (
          <p>You don’t have any songs yet.</p>
        )}
      </div>

      {showAddSong && (
        <AddSongModal
          onClose={() => setShowAddSong(false)}
          onCreated={(id) => {
            setShowAddSong(false);
            goToSong(id);
          }}
        />
      )}

      {showFilterModal && (
        <Modal title="Filter songs" onClose={() => setShowFilterModal(false)}>
          <div className="space-y-5">
            {(favoriteOnly || favoriteCount > 0) && (
              <label className="flex items-center justify-between gap-3 rounded-md border border-paper-600 p-3">
                <span>
                  <span className="block font-semibold">Favorites only</span>
                  <span className="block text-sm text-ink-600">
                    {favoriteOnly ? visibleSongs.length : favoriteCount} Songs
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={favoriteOnly}
                  onChange={(event) =>
                    setListState((state) => ({ ...state, favoriteOnly: event.target.checked }))
                  }
                />
              </label>
            )}

            <section aria-labelledby="song-tag-filters-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 id="song-tag-filters-heading" className="font-semibold">Tags</h3>
                {includedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setListState((state) => ({ ...state, includedTags: [] }))}
                    className="text-sm font-semibold text-azure-600 hover:underline"
                  >
                    Clear tag filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {facetTags.map(({ tag, selected, count }) => (
                  <button
                    key={tagKey(tag)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setListState((state) => ({
                        ...state,
                        includedTags: selected
                          ? state.includedTags.filter((item) => tagKey(item) !== tagKey(tag))
                          : [...state.includedTags, tag],
                      }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selected
                        ? "border-azure-600 bg-azure-600 text-white"
                        : "border-paper-600 hover:bg-paper-100"
                    }`}
                  >
                    {tag} <span aria-label={`${count} Songs`}>({count})</span>
                  </button>
                ))}
                {facetTags.length === 0 && (
                  <p className="text-sm text-ink-600">No tag filters are available.</p>
                )}
              </div>
            </section>

            {!includedTags.some((tag) => hasTag([tag], "Holiday")) &&
              (excludeHoliday || excludeHolidayCount > 0) && (
              <label className="flex items-center gap-3 border-t border-paper-600 pt-4">
                <input
                  type="checkbox"
                  checked={excludeHoliday}
                  onChange={(event) =>
                    setListState((state) => ({ ...state, excludeHoliday: event.target.checked }))
                  }
                />
                <span className="font-semibold">Exclude Holiday</span>
              </label>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="rounded-sm bg-azure-600 px-4 py-2 font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SongsListSkeleton() {
  return (
    <div role="status" aria-label="Loading songs">
      <span className="sr-only">Loading songs...</span>
      <ul aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index}>
            <div className="flex h-20 items-center gap-3 border-b border-border-default p-6 pl-0">
              <div className="ml-6 h-14 w-14 shrink-0 animate-pulse rounded-sm bg-surface-sunken" />
              <div className="min-w-0 flex-1 animate-pulse">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-5 w-2/3 rounded-sm bg-surface-sunken" />
                  <div className="h-4 w-10 shrink-0 rounded-sm bg-surface-sunken" />
                </div>
                <div className="mt-2 h-3.5 w-1/2 rounded-sm bg-surface-sunken" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SongRow({
  song,
  artwork,
}: {
  song: SongWithUserData;
  artwork?: RecordingArtwork;
}) {
  const credit = formatWriterCredit(song.song_artist_credits ?? []);
  const title = effectiveSongTitle(song, song.user_data);
  return (
    <>
      {/* A Song has no artwork of its own (ADR-0007); this is its
          representative Recording's cover, the same one the detail header
          borrows. Kept decorative -- the title beside it already names the row. */}
      <div className="ml-6 h-14 w-14 shrink-0 overflow-hidden rounded-sm">
        <RecordingThumbnail
          src={artwork?.src}
          fallbackSrc={artwork?.fallbackSrc}
          alt=""
          className="h-full w-full"
        />
      </div>
      <div className={`flex-1 min-w-0 ${robotoCondensed.className}`}>
        <div className="flex justify-between items-start gap-2 tracking-wider">
          <div className="flex min-w-0 items-center gap-1">
            <span className={`${leagueGothic.className} min-w-0 truncate uppercase text-xl`}>
              {title}
            </span>
            {song.user_data.favorite && (
              <>
                <StarIcon
                  className="h-4 w-4 shrink-0 text-vermillion-600"
                  aria-hidden="true"
                />
                <span className="sr-only">Favorite</span>
              </>
            )}
          </div>
          {song.year && (
            <span className="text-sm text-ink-900 shrink-0">{song.year}</span>
          )}
        </div>
        {credit && (
          <div className="text-sm tracking-wide text-ink-600 truncate">{credit}</div>
        )}
      </div>
    </>
  );
}
