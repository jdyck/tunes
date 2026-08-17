"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import type { ArtistKind } from "@/types/types";
import PaneHeader from "@/components/layout/PaneHeader";
import { useSessionState } from "@/hooks/useSessionState";

type SortKey = "name" | "songs" | "recordings";
type SortDirection = "asc" | "desc";

interface ArtistsListState {
  search: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

const isArtistsListState = (value: unknown): value is ArtistsListState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ArtistsListState>;
  return (
    typeof state.search === "string" &&
    ["name", "songs", "recordings"].includes(state.sortKey ?? "") &&
    ["asc", "desc"].includes(state.sortDirection ?? "")
  );
};

const sortLabels: Record<SortKey, string> = {
  name: "Name",
  songs: "Songs",
  recordings: "Recordings",
};

const kindLabels: Record<ArtistKind, string> = {
  person: "Person",
  group: "Group",
  orchestra: "Orchestra",
  choir: "Choir",
  character: "Character",
  other: "Other",
};

type ArtistSummary = {
  id: string;
  name: string;
  kind: ArtistKind | null;
  songCount: number;
  recordingCount: number;
};

const nameForSorting = (name: string) => {
  const filingName = name
    .trim()
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();

  return filingName || name;
};

export default function ArtistsListPane() {
  const pathname = usePathname();
  const artistResult = useQuery(api.artists.listMine, {});
  const artists = artistResult ?? [];
  const loading = artistResult === undefined;

  const [listState, setListState] = useSessionState<ArtistsListState>(
    "standards:artists-list-state",
    () => ({ search: "", sortKey: "name", sortDirection: "asc" }),
    isArtistsListState
  );
  const { search, sortKey, sortDirection } = listState;
  const [showSortMenu, setShowSortMenu] = useState(false);
  const visibleArtists = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const filtered = searchTerm
      ? artists.filter((artist) =>
          artist.name.toLowerCase().includes(searchTerm)
        )
      : artists;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "name") {
        comparison =
          nameForSorting(a.name).localeCompare(nameForSorting(b.name)) ||
          a.name.localeCompare(b.name);
      } else if (sortKey === "songs") {
        comparison =
          a.songCount - b.songCount || a.name.localeCompare(b.name);
      } else {
        comparison =
          a.recordingCount - b.recordingCount || a.name.localeCompare(b.name);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [artists, search, sortDirection, sortKey]);

  return (
    <div className="w-full h-full flex flex-col">
      <PaneHeader backHref="/" backLabel="Back">
        <div className="flex items-center justify-between pb-2">
          <h1
            className={`text-7xl uppercase tracking-wide px-4 ${leagueGothic.className}`}
          >
            Artists
          </h1>
        </div>
        <div className="pb-2">
          <div className="relative">
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
              placeholder="Search artists"
              className="w-full pl-9 pr-9 py-2 rounded-sm border-[1.5] border-ink-400 bg-surface-app"
            />
          </div>
        </div>

        <div className="pb-4 text-sm text-ink-600 flex items-center justify-between gap-3 px-4 ">
          <span
            className={`text-azure-600/90 font-bold uppercase ${leagueGothic.className} text-base tracking-widest`}
          >
            {visibleArtists.length} Artists
          </span>
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
              aria-label={`Sort ${
                sortDirection === "asc" ? "descending" : "ascending"
              }`}
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
                {(["name", "songs", "recordings"] as SortKey[]).map((key) => (
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

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-12">
        {loading ? (
          <ArtistsListSkeleton />
        ) : visibleArtists.length > 0 ? (
          <ul>
            {visibleArtists.map((artist) => {
              const isActive = pathname.startsWith(`/artist/${artist.id}`);
              return (
                <li
                  key={artist.id}
                  className="[&:has(+_li:hover)>a]:border-transparent"
                >
                  <Link
                    href={`/artist/${artist.id}`}
                    className={`relative flex items-center gap-2 border-b border-border-default h-20 p-6 pl-0 hover:bg-paper-100 hover:border-transparent hover:rounded-lg active:bg-paper-100 ${
                      isActive ? "bg-paper-100" : ""
                    }`}
                  >
                    <ArtistRow artist={artist} />
                    {isActive && (
                      <div className="w-2 h-full absolute bg-vermillion-700 shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : artists.length > 0 ? (
          <p>No artists match “{search}”.</p>
        ) : (
          <p>
            No artists yet — they appear here once your songs or recordings
            have credits.
          </p>
        )}
      </div>
    </div>
  );
}

function ArtistsListSkeleton() {
  return (
    <div role="status" aria-label="Loading artists">
      <span className="sr-only">Loading artists...</span>
      <ul aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index}>
            <div className="flex h-20 items-center gap-2 border-b border-border-default p-6 pl-0">
              <div className="min-w-0 flex-1 animate-pulse pl-6">
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

function ArtistRow({ artist }: { artist: ArtistSummary }) {
  const counts = [
    artist.songCount > 0
      ? `${artist.songCount} ${artist.songCount === 1 ? "song" : "songs"}`
      : null,
    artist.recordingCount > 0
      ? `${artist.recordingCount} ${
          artist.recordingCount === 1 ? "recording" : "recordings"
        }`
      : null,
  ].filter(Boolean);

  return (
    <div className={`pl-6 flex-1 min-w-0 ${robotoCondensed.className}`}>
      <div className="flex justify-between items-start gap-2 tracking-wider">
        <span
          className={`${leagueGothic.className} uppercase text-xl truncate min-w-0`}
        >
          {artist.name}
        </span>
        <span className="text-sm text-ink-900 shrink-0 text-right">
          {counts.join(" · ")}
        </span>
      </div>
      {artist.kind && (
        <div className="text-sm tracking-wide text-ink-600 truncate">
          {kindLabels[artist.kind]}
        </div>
      )}
    </div>
  );
}
