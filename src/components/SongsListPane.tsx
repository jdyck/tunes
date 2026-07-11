"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { PlusCircleIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import AddSongModal from "@/components/AddSongModal";
import {PlusIcon} from "@heroicons/react/24/solid";
import { formatWriterCredit } from "@/utils/songWriters";
import { useSongsList } from "@/components/SongsListContext";
import { Tune } from "@/types/types";

export default function SongsListPane() {
  const router = useRouter();
  const pathname = usePathname();
  const { tunes, loading, fetchTunes } = useSongsList();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [showAddSong, setShowAddSong] = useState(false);

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
    if (user) fetchTunes(user.id);
  }, [user]);

  const goToSong = (id: string) => {
    router.push(`/song/${id}`);
  };

  const visibleTunes = search.trim()
    ? tunes.filter((tune) =>
        tune.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : tunes;

  if (loadingUser || !user) {
    return <p className="p-4">Loading...</p>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-8">
        <h1 className={` text-7xl uppercase ${leagueGothic.className}`}>
          Songs
        </h1>
        <button
          onClick={() => setShowAddSong(true)}
          aria-label="Add song"
          className={`border-[2] border-[#AF2011]/90 text-[#AF2011]/90 p-2 py-1.75  rounded-sm tracking-widest uppercase flex font-medium items-center gap-1 ${robotoCondensed.className}`}
        >
          <PlusIcon className="h-6 w-6 " />
          <span>Add Song</span>
        </button>
        <button
          onClick={() => setShowAddSong(true)}
          className="text-[#AF2011] lg:hidden"
        >
          <PlusCircleIcon className="h-7 w-7" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-line-200 bg-cream-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p>Loading songs...</p>
        ) : visibleTunes.length > 0 ? (
          <ul>
            {visibleTunes.map((tune) => {
              const isActive = pathname.startsWith(`/song/${tune.id}`);
              return (
                <li key={tune.id} className="">
                  <Link
                    href={`/song/${tune.id}`}
                    className={`relative flex items-center gap-2 border-b border-border-default h-20 p-6 pl-0 hover:bg-cream-200 hover:border-b-0 hover:rounded-lg active:bg-cream-300 ${
                      isActive ? "bg-cream-200" : ""
                    }`}
                  >
                    <SongRow tune={tune} />
                    {isActive && (
                      <div className="w-2 h-full absolute bg-red-500 shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : tunes.length > 0 ? (
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
            if (user) fetchTunes(user.id);
            goToSong(id);
          }}
        />
      )}
    </div>
  );
}

function SongRow({ tune }: { tune: Tune }) {
  const credit = formatWriterCredit(tune.song_writers ?? []);
  return (
    <div className={`pl-6 flex-1 min-w-0 ${robotoCondensed.className}`}>
      <div className="flex justify-between items-start gap-2 tracking-wider">
        <span className={`${leagueGothic.className} uppercase text-xl truncate min-w-0`}>{tune.name}</span>
        {tune.year && (
          <span className="text-sm text-ink-900 shrink-0">{tune.year}</span>
        )}
      </div>
      {credit && (
        <div className="text-sm tracking-wide text-ink-600 truncate">{credit}</div>
      )}
    </div>
  );
}
