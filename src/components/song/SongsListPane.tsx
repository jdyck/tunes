"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import AddSongModal from "@/components/song/AddSongModal";
import { PlusIcon } from "@heroicons/react/24/solid";
import { formatWriterCredit } from "@/lib/songWriters";
import { useSongsList } from "@/components/song/SongsListContext";
import { SongWithUserData } from "@/types/types";
import PaneHeader from "@/components/layout/PaneHeader";
import { effectiveSongTitle } from "@/utils/songTitle";

type SortKey = "title" | "writers" | "date" | "added";
type SortDirection = "asc" | "desc";

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
  const { songs, loading, error, fetchSongs } = useSongsList();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [showAddSong, setShowAddSong] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoadingUser(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/login");
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (user) fetchSongs(user.id);
  }, [user]);

  const goToSong = (id: string) => {
    router.push(`/song/${id}`);
  };

  const visibleSongs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const filteredSongs = searchTerm
      ? songs.filter((song) => {
          const effectiveTitle = effectiveSongTitle(song, song.user_data);
          return (
            effectiveTitle.toLowerCase().includes(searchTerm) ||
            song.name.toLowerCase().includes(searchTerm)
          );
        })
      : songs;

    return [...filteredSongs].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "title") {
        const aTitle = effectiveSongTitle(a, a.user_data);
        const bTitle = effectiveSongTitle(b, b.user_data);
        comparison =
          titleForSorting(aTitle).localeCompare(titleForSorting(bTitle)) ||
          aTitle.localeCompare(bTitle);
      } else if (sortKey === "writers") {
        comparison = (formatWriterCredit(a.song_writers ?? []) ?? "").localeCompare(
          formatWriterCredit(b.song_writers ?? []) ?? ""
        );
      } else if (sortKey === "date") {
        comparison = String(a.year ?? "").localeCompare(String(b.year ?? ""));
      } else {
        comparison = String(a.user_data.created_at).localeCompare(
          String(b.user_data.created_at)
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [search, sortDirection, sortKey, songs]);

  if (loadingUser || !user) {
    return <p className="p-4">Loading...</p>;
  }

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
            className={`border-[2] border-mojo-600 text-mojo-600 p-2 py-1.75  rounded-sm tracking-widest uppercase flex font-medium items-center gap-1 ${robotoCondensed.className}`}
          >
            <PlusIcon className="h-5 w-5 " />
            <span>Add Song</span>
          </button>
        </div>
        <div className="pb-2">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 text-ink-700 absolute left-3 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-600 hover:bg-merino-200 hover:text-ink-900"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs"
              className="w-full pl-9 pr-9 py-2 rounded-sm border-[1.5] border-ink-400 bg-surface-app"
            />
          </div>
        </div>


        <div className="pb-4 text-sm text-ink-600 flex items-center justify-between gap-3 px-4 ">
          <span className={`text-azure-600/90 font-bold uppercase ${leagueGothic.className} text-base tracking-widest`}>{visibleSongs.length} Songs</span>
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowSortMenu((open) => !open)}
              className="px-2 py-1 rounded-sm font-semibold text-ink-800 hover:bg-merino-200"
              aria-haspopup="menu"
              aria-expanded={showSortMenu}
            >
              {sortLabels[sortKey]}
            </button>
            <button
              type="button"
              onClick={() =>
                setSortDirection((direction) =>
                  direction === "asc" ? "desc" : "asc"
                )
              }
              className="p-1 rounded-sm text-ink-800 hover:bg-merino-200"
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
                className="absolute right-0 top-full z-20 mt-1 min-w-24 rounded-md border border-line-200 bg-surface-app py-1 shadow-md"
              >
                {(["title", "writers", "date", "added"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSortKey(key);
                      setShowSortMenu(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-old-lace-100 ${
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
          <p>Loading songs...</p>
        ) : error ? (
          <p className="text-mojo-600">{error}</p>
        ) : visibleSongs.length > 0 ? (
          <ul>
            {visibleSongs.map((song) => {
              const isActive = pathname.startsWith(`/song/${song.id}`);
              return (
                <li key={song.id} className="[&:has(+_li:hover)>a]:border-b-0">
                  <Link
                    href={`/song/${song.id}`}
                    className={`relative flex items-center gap-2 border-b border-border-default h-20 p-6 pl-0 hover:bg-old-lace-100 hover:border-b-0 hover:rounded-lg active:bg-old-lace-100 ${
                      isActive ? "bg-old-lace-100" : ""
                    }`}
                  >
                    <SongRow song={song} />
                    {isActive && (
                      <div className="w-2 h-full absolute bg-mojo-700 shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
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
            if (user) fetchSongs(user.id);
            goToSong(id);
          }}
        />
      )}
    </div>
  );
}

function SongRow({ song }: { song: SongWithUserData }) {
  const credit = formatWriterCredit(song.song_writers ?? []);
  const title = effectiveSongTitle(song, song.user_data);
  return (
    <div className={`pl-6 flex-1 min-w-0 ${robotoCondensed.className}`}>
      <div className="flex justify-between items-start gap-2 tracking-wider">
        <span className={`${leagueGothic.className} uppercase text-xl truncate min-w-0`}>{title}</span>
        {song.year && (
          <span className="text-sm text-ink-900 shrink-0">{song.year}</span>
        )}
      </div>
      {credit && (
        <div className="text-sm tracking-wide text-ink-600 truncate">{credit}</div>
      )}
    </div>
  );
}
